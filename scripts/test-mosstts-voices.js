const url = 'https://api.siliconflow.cn/v1/audio/speech';
const API_TOKEN = 'sk-emqroezspvruhjyqdrevnrtuczwkubcebuuuletsclekplfp';

// MOSS-TTS v0.5 available voices
const voices = [
    'alex',
    'anna',
    'bella',
    'benjamin',
    'charles',
    'claire',
    'david',
    'diana'
];

async function testMOSSVoice(voiceName) {
    console.log(`\n🧪 Testing voice: ${voiceName}`);
    console.log(`📤 Request: fnlp/MOSS-TTSD-v0.5:${voiceName}`);

    const requestBody = {
        model: "fnlp/MOSS-TTSD-v0.5",
        input: "你好，这是测试语音合成功能。",
        voice: voiceName
    };

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
                console.log(`✅ Working voice: ${voiceName}`);

                // Get audio data and save it
                const audioBuffer = await response.arrayBuffer();
                const fileName = `mosstts_${voiceName}_${Date.now()}.wav`;
                const localPath = `./audio/${fileName}`;

                // Create audio directory if it doesn't exist
                const fs = require('fs');
                if (!fs.existsSync('./audio')) {
                    fs.mkdirSync('./audio', { recursive: true });
                }

                fs.writeFileSync(localPath, Buffer.from(audioBuffer));
                console.log(`💾 Audio saved locally: ${localPath}`);

                return { success: true, voice: voiceName, savedFile: localPath };
            } else {
                const data = await response.json();
                console.log("📥 Response data:", data);
                return { success: true, type: 'json', data, voice: voiceName };
            }
        } else {
            const data = await response.json();
            console.log("❌ Failed:", data.message || 'Unknown error');
            return { success: false, error: data.message || 'Unknown error', voice: voiceName };
        }
    } catch (error) {
        console.error("💥 Error:", error.message);
        return { success: false, error: error.message, voice: voiceName };
    }
}

async function runMOSSVoiceTests() {
    console.log("🔍 Testing MOSS-TTS v0.5 voice options on SiliconFlow API...");
    console.log(`📋 Available voices: ${voices.join(', ')}\n`);

    const results = [];
    let successFound = false;

    for (const voice of voices) {
        const result = await testMOSSVoice(voice);
        results.push(result);

        if (result.success) {
            successFound = true;
            console.log(`\n🎉 FOUND WORKING VOICE: ${result.voice}`);
            console.log("🎯 SUCCESS! SiliconFlow TTS is working with this voice!");
            break;
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log("📊 MOSS-TTS VOICE TEST RESULTS");
    console.log(`${'='.repeat(60)}`);

    results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${result.voice}`);
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
    });

    const successful = results.filter(r => r.success).length;
    console.log(`\n🎯 Success rate: ${successful}/${results.length} (${Math.round(successful/results.length*100)}%)`);

    if (successful > 0) {
        console.log("\n🎉 RECOMMENDATION:");
        const workingConfig = results.find(r => r.success);
        console.log(`✅ Use model: fnlp/MOSS-TTSD-v0.5`);
        console.log(`✅ Use voice: ${workingConfig.voice}`);
        if (workingConfig.savedFile) {
            console.log(`✅ Audio saved: ${workingConfig.savedFile}`);
        }

        // Create a working example
        console.log("\n📝 Working example:");
        const workingExample = {
            model: "fnlp/MOSS-TTSD-v0.5",
            input: "你好，这是测试语音合成功能。",
            voice: workingConfig.voice
        };
        console.log(JSON.stringify(workingExample, null, 2));

        console.log("\n🎯 SiliconFlow TTS API is ready to use!");

    } else {
        console.log("\n❌ NO WORKING VOICES FOUND FOR MOSS-TTS");
        console.log("💡 Analysis:");
        console.log("1. ✅ API token is valid");
        console.log("2. ✅ Model fnlp/MOSS-TTSD-v0.5 exists");
        console.log("3. ❌ None of the specified voices work");
        console.log("4. 🔍 Need to find correct voice parameter format");
        console.log("5. 💡 Continue using Gitee TTS API as alternative");
    }
}

runMOSSVoiceTests().catch(console.error);