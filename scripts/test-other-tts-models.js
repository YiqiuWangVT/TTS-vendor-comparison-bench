const url = 'https://api.siliconflow.cn/v1/audio/speech';
const API_TOKEN = 'sk-emqroezspvruhjyqdrevnrtuczwkubcebuuuletsclekplfp';

// Test different TTS models
const ttsModels = [
    {
        name: "CosyVoice2-0.5B",
        model: "FunAudioLLM/CosyVoice2-0.5B"
    },
    {
        name: "SenseVoiceSmall",
        model: "FunAudioLLM/SenseVoiceSmall"
    },
    {
        name: "IndexTTS-2",
        model: "IndexTeam/IndexTTS-2"
    },
    {
        name: "Fish Speech 1.4",
        model: "fishaudio/fish-speech-1.4"
    },
    {
        name: "Fish Speech 1.5",
        model: "fishaudio/fish-speech-1.5"
    },
    {
        name: "GPT-SoVITS",
        model: "RVC-Boss/GPT-SoVITS"
    }
];

// Test different voice parameters
const voiceTests = [
    { voice: "default", description: "Default voice" },
    { voice: "female", description: "Female voice" },
    { voice: "male", description: "Male voice" },
    { voice: "nova", description: "Nova voice (OpenAI style)" },
    { voice: "alloy", description: "Alloy voice (OpenAI style)" },
    { voice: "echo", description: "Echo voice (OpenAI style)" },
    { voice: "fable", description: "Fable voice (OpenAI style)" },
    { voice: "onyx", description: "Onyx voice (OpenAI style)" },
    { voice: "shimmer", description: "Shimmer voice (OpenAI style)" }
];

async function testTTSModel(modelConfig, voiceConfig) {
    console.log(`\n🧪 Testing model: ${modelConfig.name} with voice: ${voiceConfig.description}`);
    console.log(`📤 Model: ${modelConfig.model}, Voice: ${voiceConfig.voice}`);

    let requestBody = {
        model: modelConfig.model,
        input: "你好，这是测试语音合成功能。"
    };

    // Add voice parameter if available
    if (voiceConfig.voice) {
        requestBody.voice = voiceConfig.voice;
    }

    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    };

    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type');

        console.log(`📥 Response status: ${response.status}`);
        console.log(`📥 Content-Type: ${contentType}`);

        if (response.ok) {
            if (contentType && contentType.includes('audio')) {
                console.log("🎉 SUCCESS! Received audio data");
                return { success: true, type: 'audio', model: modelConfig.name, voice: voiceConfig.voice };
            } else {
                const data = await response.json();
                console.log("📥 Response data:", data);
                return { success: true, type: 'json', data, model: modelConfig.name, voice: voiceConfig.voice };
            }
        } else {
            const data = await response.json();
            console.log("❌ Failed:", data.message || 'Unknown error');
            return { success: false, error: data.message || 'Unknown error', model: modelConfig.name, voice: voiceConfig.voice };
        }
    } catch (error) {
        console.error("💥 Error:", error.message);
        return { success: false, error: error.message, model: modelConfig.name, voice: voiceConfig.voice };
    }
}

async function runTests() {
    console.log("🔍 Testing different TTS models on SiliconFlow API...\n");

    const results = [];
    let successFound = false;

    for (const modelConfig of ttsModels) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎵 Testing Model: ${modelConfig.name}`);
        console.log(`${'='.repeat(60)}`);

        // Test first with default voice, then try a few others if needed
        const voicesToTest = successFound ? [] : ["default", "female", "male", "nova", "alloy"];

        for (const voice of voicesToTest) {
            const voiceConfig = voiceTests.find(v => v.voice === voice);
            if (voiceConfig) {
                const result = await testTTSModel(modelConfig, voiceConfig);
                results.push(result);

                if (result.success) {
                    successFound = true;
                    console.log(`\n🎉 FOUND WORKING CONFIGURATION!`);
                    console.log(`✅ Model: ${result.model}`);
                    console.log(`✅ Voice: ${result.voice}`);
                    console.log(`✅ Type: ${result.type}`);
                    break;
                }

                // Add delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (successFound) {
            break; // Stop testing once we find a working configuration
        }

        // Add longer delay between different models
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log("📊 TEST RESULTS SUMMARY");
    console.log(`${'='.repeat(60)}`);

    results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        const voiceInfo = result.voice ? ` (${result.voice})` : '';
        console.log(`${index + 1}. ${status} ${result.model}${voiceInfo}`);
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
    });

    const successful = results.filter(r => r.success).length;
    console.log(`\n🎯 Success rate: ${successful}/${results.length} (${Math.round(successful/results.length*100)}%)`);

    if (successful > 0) {
        console.log("\n🎉 RECOMMENDATION:");
        const workingConfig = results.find(r => r.success);
        console.log(`✅ Use model: ${workingConfig.model}`);
        console.log(`✅ Use voice: ${workingConfig.voice}`);
        console.log(`✅ Response type: ${workingConfig.type}`);

        // Create a working example
        console.log("\n📝 Working example:");
        const workingExample = {
            model: workingConfig.model,
            input: "你好，这是测试语音合成功能。",
            voice: workingConfig.voice
        };
        console.log(JSON.stringify(workingExample, null, 2));
    } else {
        console.log("\n❌ NO WORKING CONFIGURATIONS FOUND");
        console.log("💡 Suggestions:");
        console.log("1. Check SiliconFlow API documentation for correct parameters");
        console.log("2. Try different API endpoints (maybe /v1/audio/speech is not correct)");
        console.log("3. Check if these models require different request format");
        console.log("4. Continue using Gitee TTS API as alternative");
    }
}

runTests().catch(console.error);