import fs from "fs";
import open from "open";
import https from "https";
import { URL } from "url";

const API_URL = "https://ai.gitee.com/v1/async/audio/speech";
const API_TOKEN = "FB8F11UGSXAMARF1TZLJJA82D4KOBY1CLMS6JD13";
const headers = {
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json"
}

interface TaskResponse {
    task_id?: string;
    status?: string;
    created_at?: number;
    urls?: {
        get?: string;
        cancel?: string;
    };
    error?: string;
    message?: string;
    output?: {
        file_url?: string;
    };
    started_at?: number;
    completed_at?: number;
}

function downloadFile(url: string, localPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(localPath);

        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode} ${response.statusMessage}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log(`💾 Audio saved locally: ${localPath}`);
                resolve();
            });

            file.on('error', (err) => {
                fs.unlink(localPath, () => {}); // Delete the partial file
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function query(data: any): Promise<TaskResponse> {
    const response = await fetch(
        API_URL,
        {
            headers,
            method: "POST",
            body: JSON.stringify(data)
        }
    );
    return response.json();
}

async function pollTask(taskId: string): Promise<TaskResponse> {
    const statusUrl = `https://ai.gitee.com/v1/task/${taskId}`;
    const retryInterval = 10 * 1000;
    const maxAttempts = (30 * 60) / 10;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        process.stdout.write(`Checking task status [${attempt}]...`);
        const response = await fetch(statusUrl, { headers });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const result: TaskResponse = await response.json();
        if (result.error) {
            throw new Error(`${result.error}: ${result.message || "Unknown error"}`);
        }
        const status = result.status || "unknown";
        console.log(status);

        if (status === "success") {
            if (result.output?.file_url) {
                const duration =
                    ((result.completed_at || 0) - (result.started_at || 0)) / 1000;
                console.log(`🔗 Download link: ${result.output.file_url}`);
                console.log(`⏱️ Task duration: ${duration.toFixed(2)}`);

                // Save file locally
                try {
                    const url = new URL(result.output.file_url);
                    const urlPath = url.pathname;
                    const fileName = urlPath.split('/').pop() || `audio_${taskId}.wav`;
                    const localPath = `./audio/${fileName}`;

                    // Create audio directory if it doesn't exist
                    if (!fs.existsSync('./audio')) {
                        fs.mkdirSync('./audio', { recursive: true });
                    }

                    await downloadFile(result.output.file_url, localPath);

                    // Also open in browser for convenience
                    await open(result.output.file_url);
                } catch (error) {
                    console.error("❌ Failed to save file locally:", error);
                    // Still open in browser as fallback
                    await open(result.output.file_url);
                }
            } else {
                console.log("⚠️ No output URL found");
            }
        } else if (["failed", "cancelled"].includes(status)) {
            console.log(`❌ Task ${status}`);
        } else {
            await new Promise((resolve) => setTimeout(resolve, retryInterval));
            continue;
        }

        const taskFile = `task_nihao_luna_${taskId}.json`;
        fs.writeFileSync(taskFile, JSON.stringify(result, null, 4));
        console.log(`Task saved to ${taskFile}`);
        return result;
    }

    console.log(`⏰ Maximum attempts reached (${maxAttempts})`);
    return { status: "timeout", message: "Maximum wait time exceeded" };
}

async function generateNihaoLuna(): Promise<void> {
    console.log("🎤 Generating audio for '你好luna'...");
    const result = await query({
        "inputs": "[S1]你好luna",
        "model": "MOSS-TTSD-v0.5",
        "audio_mode": "Role",
        "prompt_audio_1_url": "https://gitee.com/wei-xiaohui1/test1/raw/master/zh_spk1_moon.wav",
        "prompt_text_1": "周一到周五，每天早晨七点半到九点半的直播片段。言下之意呢，就是废话有点多，大家也别嫌弃，因为这都是直播间最真实的状态了。",
        "prompt_audio_2_url": "https://gitee.com/wei-xiaohui1/test1/raw/master/zh_spk2_moon.wav",
        "prompt_text_2": "如果大家想听到更丰富更及时的直播内容，记得在周一到周五准时进入直播间，和大家一起畅聊新消费新科技新趋势。",
        "use_normalize": true
    });

    console.log("API Response:", JSON.stringify(result, null, 2));

    const taskId = result.task_id;
    if (!taskId) {
        throw new Error("Task ID not found in the response.");
    }
    console.log(`Task ID: ${taskId}`);
    const task = await pollTask(taskId);
    if (task.status === "success") {
        console.log("✅ Audio generation completed successfully!");
        console.log("🎵 Audio file '你好luna' has been saved to the ./audio/ directory");
    }
}

generateNihaoLuna().catch(console.error);