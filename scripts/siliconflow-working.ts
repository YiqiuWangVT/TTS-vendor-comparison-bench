import fs from "fs";
import https from "https";
import { URL } from "url";

const API_URL = "https://api.siliconflow.cn/v1/audio/speech";
const API_TOKEN = "sk-emqroezspvruhjyqdrevnrtuczwkubcebuuuletsclekplfp";

interface TTSRequest {
    model: string;
    input: string;
    voice?: string;
    response_format?: string;
    speed?: number;
}

interface TTSResponse {
    audio?: string; // base64 encoded audio data
    error?: string;
    message?: string;
}

function downloadAudio(base64Audio: string, localPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            // Remove data URL prefix if present
            const base64Data = base64Audio.replace(/^data:audio\/[^;]+;base64,/, '');
            const audioBuffer = Buffer.from(base64Data, 'base64');

            fs.writeFileSync(localPath, audioBuffer);
            console.log(`💾 Audio saved locally: ${localPath}`);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

async function generateSpeech(data: TTSRequest): Promise<void> {
    console.log("Generating speech with SiliconFlow API...");
    console.log("Model:", data.model);
    console.log("Voice:", data.voice);
    console.log("Input:", data.input);

    try {
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify(data)
        });

        // Check if response is audio or JSON
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("audio")) {
            // Direct audio response - save to file
            const audioBuffer = await response.arrayBuffer();
            const fileName = `siliconflow_${Date.now()}.wav`;
            const localPath = `./audio/${fileName}`;

            // Create audio directory if it doesn't exist
            if (!fs.existsSync('./audio')) {
                fs.mkdirSync('./audio', { recursive: true });
            }

            fs.writeFileSync(localPath, Buffer.from(audioBuffer));
            console.log(`💾 Audio saved locally: ${localPath}`);
            console.log(`✅ Speech generation completed successfully!`);
        } else {
            // JSON response with base64 audio
            const result: TTSResponse = await response.json();

            if (result.error) {
                throw new Error(`${result.error}: ${result.message || "Unknown error"}`);
            }

            if (result.audio) {
                const fileName = `siliconflow_${Date.now()}.wav`;
                const localPath = `./audio/${fileName}`;

                // Create audio directory if it doesn't exist
                if (!fs.existsSync('./audio')) {
                    fs.mkdirSync('./audio', { recursive: true });
                }

                await downloadAudio(result.audio, localPath);
                console.log(`✅ Speech generation completed successfully!`);
            } else {
                console.log("⚠️ No audio data found in response");
            }
        }
    } catch (error) {
        console.error("❌ Error generating speech:", error instanceof Error ? error.message : String(error));
        throw error;
    }
}

async function testDefaultVoices(): Promise<void> {
    console.log("🔍 Testing SiliconFlow MOSS-TTS with default voices...\n");

    // Test with default voices (alex and anna)
    const testTexts = [
        {
            voice: "fnlp/MOSS-TTSD-v0.5:alex",
            text: "你好，我是 Alex，这是测试语音合成。"
        },
        {
            voice: "fnlp/MOSS-TTSD-v0.5:anna",
            text: "你好，我是 Anna，这是测试语音合成。"
        },
        {
            voice: "fnlp/MOSS-TTSD-v0.5:bella",
            text: "你好，我是 Bella，这是测试语音合成。"
        },
        {
            voice: "fnlp/MOSS-TTSD-v0.5:benjamin",
            text: "你好，我是 Benjamin，这是测试语音合成。"
        }
    ];

    for (let i = 0; i < testTexts.length; i++) {
        const test = testTexts[i];
        console.log(`\n🎤 Test ${i + 1}: Voice ${test.voice}`);

        try {
            await generateSpeech({
                model: "fnlp/MOSS-TTSD-v0.5",
                voice: test.voice,
                input: test.text,
                response_format: "wav"
            });
            console.log("✅ Success with", test.voice);
            break; // Stop after first success
        } catch (error) {
            console.log("❌ Failed:", error instanceof Error ? error.message : String(error));
            if (i === testTexts.length - 1) {
                console.log("\n🔄 All default voices failed.");
            }
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function generateCustomText(text: string, voice: string = "fnlp/MOSS-TTSD-v0.5:alex"): Promise<void> {
    try {
        await generateSpeech({
            model: "fnlp/MOSS-TTSD-v0.5",
            voice: voice,
            input: text,
            response_format: "wav"
        });
        console.log("✅ Speech generation completed!");
    } catch (error) {
        console.error("❌ Error:", error instanceof Error ? error.message : String(error));
        throw error;
    }
}

// Main execution
async function main(): Promise<void> {
    try {
        // Test default voices first
        await testDefaultVoices();

        // If you want to generate custom text, uncomment the line below:
        // await generateCustomText("你好，这是自定义文本测试。");
    } catch (error) {
        console.error("❌ Script failed:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// Usage examples:
// 1. Test default voices
// node scripts/siliconflow-working.ts

// 2. Generate custom text with specific voice
// await generateCustomText("你好世界", "fnlp/MOSS-TTSD-v0.5:alex");

main().catch(console.error);