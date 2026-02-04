import fs from "fs";

const API_URL = "https://api.siliconflow.cn/v1/audio/speech";
const API_TOKEN = "sk-emqroezspvruhjyqdrevnrtuczwkubcebuuuletsclekplfp";

async function generateSpeech(model: string, voice: string, input: string): Promise<void> {
    console.log("🎤 Generating speech with SiliconFlow API...");
    console.log(`Model: ${model}`);
    console.log(`Voice: ${voice}`);
    console.log(`Input: ${input}`);

    try {
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({
                model: model,
                voice: voice,
                input: input,
                response_format: "wav"
            })
        });

        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("audio")) {
            // Direct audio response
            const audioBuffer = await response.arrayBuffer();
            const fileName = `siliconflow_${voice.split(':')[1]}_${Date.now()}.wav`;
            const localPath = `./audio/${fileName}`;

            // Create audio directory if it doesn't exist
            if (!fs.existsSync('./audio')) {
                fs.mkdirSync('./audio', { recursive: true });
            }

            fs.writeFileSync(localPath, Buffer.from(audioBuffer));
            console.log(`💾 Audio saved locally: ${localPath}`);
            console.log(`✅ Speech generation completed successfully!`);

            // Get file size
            const stats = fs.statSync(localPath);
            console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)} KB`);
        } else {
            const result = await response.json();
            console.log("❌ API Response:", result);
            throw new Error(result.error?.message || "Unknown error");
        }
    } catch (error) {
        console.error("❌ Error generating speech:", error instanceof Error ? error.message : String(error));
        throw error;
    }
}

// Test with the specific Chinese text using Anna's voice
const customText = "他在公司工作了十年，从一名普通员工成长为部门经理，积累了丰富的经验。";

generateSpeech("fnlp/MOSS-TTSD-v0.5", "fnlp/MOSS-TTSD-v0.5:anna", customText)
    .then(() => console.log("\n🎉 Audio generation completed successfully!"))
    .catch(console.error);