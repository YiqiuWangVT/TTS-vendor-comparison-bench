import fs from "fs";
import https from "https";

const API_URL = "https://api.siliconflow.cn/v1/audio/speech";
const API_TOKEN = "sk-emqroezspvruhjyqdrevnrtuczwkubcebuuuletsclekplfp";

interface TTSRequest {
    model: string;
    input: string;
    voice?: string;
    response_format?: string;
    speed?: number;
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
            const fileName = `siliconflow_anna_${Date.now()}.wav`;
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
            const result = await response.json();
            console.log("Response:", result);

            if (result.error) {
                throw new Error(`${result.error}: ${result.message || "Unknown error"}`);
            }

            if (result.audio) {
                const fileName = `siliconflow_anna_${Date.now()}.wav`;
                const localPath = `./audio/${fileName}`;

                // Create audio directory if it doesn't exist
                if (!fs.existsSync('./audio')) {
                    fs.mkdirSync('./audio', { recursive: true });
                }

                // Convert base64 to binary and save
                const base64Data = result.audio.replace(/^data:audio\/[^;]+;base64,/, '');
                const audioBuffer = Buffer.from(base64Data, 'base64');
                fs.writeFileSync(localPath, audioBuffer);

                console.log(`💾 Audio saved locally: ${localPath}`);
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

// Test with anna voice
generateSpeech({
    model: "fnlp/MOSS-TTSD-v0.5",
    voice: "fnlp/MOSS-TTSD-v0.5:anna",
    input: "你好，我是 Anna，这是测试语音合成。",
    response_format: "wav"
}).catch(console.error);