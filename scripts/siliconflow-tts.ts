import fs from "fs";
import https from "https";
import { URL } from "url";

const API_URL = "https://api.siliconflow.cn/v1/audio/speech";
const API_TOKEN = "sk-emqroezspvruhjyqdrevnrtuczwkubcebuuuletsclekplfp";
const headers = {
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json"
}

interface TTSRequest {
    model: string;
    input: string;
    voice?: string;
    speed?: number;
    audio_mode?: string;
    prompt_audio_1_url?: string;
    prompt_text_1?: string;
    prompt_audio_2_url?: string;
    prompt_text_2?: string;
    use_normalize?: boolean;
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
    console.log("Input:", data.input);

    try {
        // Use the exact format from the curl command example
        const requestData = {
            model: data.model,
            input: data.input
        };

        const response = await fetch(API_URL, {
            headers,
            method: "POST",
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
        }

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
        console.error("❌ Error generating speech:", error);
        throw error;
    }
}

async function main(): Promise<void> {
    try {
        // Test with different voice options
        const voices = ["default", "male", "female", "zh-CN-XiaoxiaoNeural", "en-US-JennyNeural"];

        for (const voice of voices) {
            console.log(`\n🎤 Testing with voice: ${voice}`);
            try {
                await generateSpeech({
                    "model": "fnlp/MOSS-TTSD-v0.5",
                    "input": "[S1]Hello, how are you today?[S2]I'm doing great, thanks for asking![S1]That's wonderful to hear ",
                    "voice": voice
                });
                console.log("✅ Success with voice:", voice);
                break; // If successful, stop trying other voices
            } catch (error) {
                console.log(`❌ Failed with voice ${voice}:`, error instanceof Error ? error.message : String(error));
                if (voice === voices[voices.length - 1]) {
                    console.log("\n🔄 All voice options failed. Creating a demo script for reference audio approach...");
                    await createReferenceAudioDemo();
                }
            }
        }
    } catch (error) {
        console.error("❌ Script failed:", error);
        process.exit(1);
    }
}

async function createReferenceAudioDemo(): Promise<void> {
    console.log("📝 SiliconFlow TTS API 参考音频示例脚本");
    console.log("==========================================");
    console.log();
    console.log("由于 MOSS-TTS 模型需要语音或参考音频，这里提供一个示例请求格式：");
    console.log();
    console.log("curl --request POST \\");
    console.log("  --url https://api.siliconflow.cn/v1/audio/speech \\");
    console.log("  --header 'Authorization: Bearer sk-emqroezspvruhjyqdrevnrtuczwkubcebuuuletsclekplfp' \\");
    console.log("  --header 'Content-Type: application/json' \\");
    console.log("  --data '{");
    console.log("    \"model\": \"fnlp/MOSS-TTSD-v0.5\",");
    console.log("    \"input\": \"[S1]你好，今天天气怎么样？[S2]天气很好，谢谢你的关心！\",");
    console.log("    \"audio_mode\": \"Role\",");
    console.log("    \"prompt_audio_1_url\": \"https://example.com/reference1.wav\",");
    console.log("    \"prompt_text_1\": \"参考音频1对应的文本\",");
    console.log("    \"prompt_audio_2_url\": \"https://example.com/reference2.wav\",");
    console.log("    \"prompt_text_2\": \"参考音频2对应的文本\"");
    console.log("  }'");
    console.log();
    console.log("📋 需要准备的文件：");
    console.log("1. 参考音频文件（WAV 格式）");
    console.log("2. 对应的参考文本");
    console.log("3. 上传音频文件到可访问的 URL");
    console.log();
    console.log("🔧 替代方案：");
    console.log("1. 使用其他支持简单语音参数的 TTS 模型");
    console.log("2. 联系 SiliconFlow 获取 MOSS-TTS 的详细参数说明");
    console.log("3. 使用 OpenAI TTS API 作为备选方案");
}

main().catch(console.error);