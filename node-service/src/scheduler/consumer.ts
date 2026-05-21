import { consumer } from '../config/kafka';
import Scan   from '../models/Scan';
import Zone   from '../models/Zone';
import Alert  from '../models/Alert';
import env    from '../config/env';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { broadcastAlert, broadcastScanUpdate } from '../utils/socket';

// ML Service URL (locally running Windows pe)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// ── Qwen Comparison Trigger ──────────────────────────────────
const triggerComparisonAnalysis = async (
  imagePathOld: string,
  imagePathNew: string,
  forestLoss:   number,
  jobId:        string,
  bbox:         number[] | null,
): Promise<any> => {
  try {
    console.log(`[${jobId}] Triggering Qwen comparison | loss=${forestLoss}%`);
    const res = await axios.post(`${ML_SERVICE_URL}/api/compare`, {
      image_path_old: imagePathOld,
      image_path_new: imagePathNew,
      forest_loss:    forestLoss,
      job_id:         jobId,
      bbox:           bbox,
    }, { timeout: 120_000 });   // 2 images = 2x inference, 2 min timeout
    console.log(`[${jobId}] Comparison done | type=${res.data.change_type}`);
    return res.data;
  } catch (err: any) {
    console.error(`[${jobId}] Comparison API failed:`, err?.message);
    return null;
  }
};

// ── Severity from forest loss % ──────────────────────────────
const getSeverity = (loss: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
  if (loss < 5)  return 'LOW';
  if (loss < 15) return 'MEDIUM';
  if (loss < 30) return 'HIGH';
  return 'CRITICAL';
};

// ── Email helper ─────────────────────────────────────────────
const sendAlertEmail = async (
  toEmail: string, zoneName: string, loss: number,
  severity: string, threats: string[], description: string
): Promise<void> => {
  if (!env.SMTP_USER || !env.SMTP_PASS) return;

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  const threatsStr = threats.filter(t => t !== 'none').join(', ') || 'None detected';

  await transporter.sendMail({
    from:    `"EcoWatch Alert" <${env.SMTP_USER}>`,
    to:      toEmail,
    subject: `[${severity}] Environmental Alert — ${zoneName}`,
    html: `
      <h2>🌍 EcoWatch Environmental Alert</h2>
      <p><strong>Zone:</strong> ${zoneName}</p>
      <p><strong>Forest Loss:</strong> ${loss.toFixed(1)}%</p>
      <p><strong>Severity:</strong> ${severity}</p>
      <p><strong>Threats Detected:</strong> ${threatsStr}</p>
      <p><strong>AI Analysis:</strong> ${description}</p>
      <hr/>
      <p>Please take immediate action!</p>
    `,
  });

  console.log(`Alert email sent for zone: ${zoneName}`);
};

// ── Main Consumer ────────────────────────────────────────────
export const startResultConsumer = async (): Promise<void> => {
  await consumer.subscribe({
    topic:         env.KAFKA_TOPIC_CONSUME,
    fromBeginning: false,
  });

  console.log(`✅ Result consumer subscribed: ${env.KAFKA_TOPIC_CONSUME}`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const result = JSON.parse(message.value.toString());

        const {
          job_id, zone_id,
          forest_percentage, vegetation_percentage,
          bare_soil_percentage, water_percentage,
          ndvi_mean, ndvi_min, ndvi_max,
          threats, severity, description, affected_areas,
          forest_visible, vl_confidence,
          deforestation_detected, heatmap_path,
          original_image_path,   // comparison ke liye
        } = result;

        console.log(
          `[${job_id}] Result | zone=${zone_id} | ` +
          `forest=${forest_percentage}% | threats=${JSON.stringify(threats)} | ` +
          `severity=${severity}`
        );

        // 1. Scan update karo (pending → completed)
        const scan = await Scan.findOneAndUpdate(
          { jobId: job_id },
          {
            status:   'completed',
            scanDate: new Date(),
            results: {
              forestPercentage:     forest_percentage,
              vegetationPercentage: vegetation_percentage,
              bareSoilPercentage:   bare_soil_percentage,
              waterPercentage:      water_percentage,
              ndviMean:             ndvi_mean,
              ndviMin:              ndvi_min,
              ndviMax:              ndvi_max,
              threats:              threats || ['none'],
              severity:             severity || 'none',
              description:          description || '',
              affectedAreas:        affected_areas || [],
              forestVisible:        forest_visible || false,
              vlConfidence:         vl_confidence || 'low',
              // Combined
              deforestationDetected: deforestation_detected,
              heatmapPath:           heatmap_path || '',
              originalImagePath:     original_image_path || '',  // comparison ke liye
            },
          },
          { new: true }
        );

        if (!scan) {
          console.warn(`[${job_id}] Scan record not found in DB`);
          return;
        }

        // Broadcast updated scan
        const populatedScan = await Scan.findById(scan._id).populate('zoneId', 'name bbox');
        if (populatedScan) {
          broadcastScanUpdate(populatedScan);
        }

        // 2. Zone lastScanned update karo
        const zone = await Zone.findByIdAndUpdate(
          zone_id,
          { lastScanned: new Date() },
          { new: true }
        );

        // 3. Previous scan dhundho
        const prevScan = await Scan.findOne({
          zoneId: zone_id,
          status: 'completed',
          _id:    { $ne: scan._id },
        }).sort({ createdAt: -1 });

        // 4. Alert logic: Multi-Threat (NDVI forest loss, bare soil increase, water loss) + Qwen severity
        if (zone) {
          let shouldAlert      = false;
          let loss             = 0;
          let bareSoilInc      = 0;
          let waterLoss        = 0;
          let alertSeverity    = 'LOW';
          let threatMsg        = '';

          // Temporal comparison
          if (prevScan) {
            const prevForestPct = prevScan.results.forestPercentage;
            const prevBarePct   = prevScan.results.bareSoilPercentage;
            const prevWaterPct  = prevScan.results.waterPercentage;

            loss        = parseFloat((prevForestPct - forest_percentage).toFixed(2));
            bareSoilInc = parseFloat((bare_soil_percentage - prevBarePct).toFixed(2));
            waterLoss   = parseFloat((prevWaterPct - water_percentage).toFixed(2));

            const maxChange = Math.max(loss, bareSoilInc, waterLoss);

            if (maxChange > zone.alertThreshold) {
              shouldAlert   = true;
              alertSeverity = getSeverity(maxChange);
              
              const messages = [];
              if (loss > zone.alertThreshold)        messages.push(`${loss}% forest loss`);
              if (bareSoilInc > zone.alertThreshold) messages.push(`${bareSoilInc}% bare soil increase (potential mining)`);
              if (waterLoss > zone.alertThreshold)   messages.push(`${waterLoss}% water loss (drought/damming)`);
              threatMsg = messages.join(', ');
            }
          }

          // Qwen high/critical = alert even without prev scan
          if (severity === 'high' || severity === 'critical') {
            shouldAlert   = true;
            alertSeverity = severity.toUpperCase();
            threatMsg     = threatMsg || `AI Detected Threats: ${(threats as string[]).join(', ')}`;
          }

          if (shouldAlert) {
            const alertMsg = prevScan
              ? `Zone "${zone.name}" — ${threatMsg}.`
              : `Zone "${zone.name}" — Environmental threat detected. Threats: ${(threats as string[]).join(', ')}`;

            const alert = await Alert.create({
              zoneId:           zone_id,
              scanId:           scan._id,
              prevScanId:       prevScan?._id,
              forestLoss:       Math.max(0, loss),
              bareSoilIncrease: Math.max(0, bareSoilInc),
              waterLoss:        Math.max(0, waterLoss),
              severity:         alertSeverity,
              message:          alertMsg,
            });

            console.log(`ALERT | zone=${zone.name} | severity=${alertSeverity} | ${threatMsg}`);
            
            // Broadcast alert to WebSockets (Live Dashboard Updates)
            broadcastAlert(alert);

            // ── Qwen Deep Comparison (sirf tab jab dono images hain aur koi loss hai) ─────────
            // NDVI ne confirm kiya, ab Qwen exact change batayega
            const newImagePath  = (scan as any).results?.originalImagePath || '';
            const prevImagePath = (prevScan as any)?.results?.originalImagePath || '';

            if (prevScan && prevImagePath && newImagePath && (loss > 0 || bareSoilInc > 0 || waterLoss > 0)) {
              try {
                // Get bbox array if exists
                const bboxArr = zone.bbox ? [zone.bbox.lng_min, zone.bbox.lat_min, zone.bbox.lng_max, zone.bbox.lat_max] : null;

                const compareResult = await triggerComparisonAnalysis(
                  prevImagePath, newImagePath, loss, alert._id.toString(), bboxArr
                );

                if (compareResult) {
                  const updateData: any = {
                    changeType:           compareResult.change_type,
                    probableCause:        compareResult.probable_cause,
                    changedAreas:         compareResult.changed_areas,
                    changeDescription:    compareResult.change_description,
                    comparisonImagePath:  compareResult.comparison_image_path,
                  };

                  if (compareResult.hotspot_lat && compareResult.hotspot_lng) {
                    updateData.hotspot = {
                      lat: compareResult.hotspot_lat,
                      lng: compareResult.hotspot_lng,
                    };
                  }

                  await Alert.findByIdAndUpdate(alert._id, updateData);
                  console.log(`[${alert._id}] Alert enriched with Qwen comparison & hotspot`);
                }
              } catch (compareErr) {
                console.error('Comparison enrichment failed:', compareErr);
              }
            }

            // Email
            try {
              await sendAlertEmail(
                zone.createdBy?.toString() || '',
                zone.name, loss, alertSeverity, threats as string[], description
              );
              await Alert.findByIdAndUpdate(alert._id, { emailSent: true });
            } catch (emailErr) {
              console.error('Email failed:', emailErr);
            }
          }
        }

      } catch (err) {
        console.error('Error processing result message:', err);
      }
    },
  });
};
