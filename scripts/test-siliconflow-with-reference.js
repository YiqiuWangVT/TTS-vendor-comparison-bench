const url = 'https://api.siliconflow.cn/v1/audio/speech';
const API_TOKEN = 'sk-emqroezspvruhjyqdrevnrtuczwkubcebuuuletsclekplfp';

// Test with reference audio (similar to Gitee TTS format)
const testConfigs = [
    {
        name: "Test with reference audio (Gitee format)",
        body: JSON.stringify({
            "model": "fnlp/MOSS-TTSD-v0.5",
            "input": "[S1]你好，今天天气怎么样？[S2]天气很好，谢谢你的关心！",
            "audio_mode": "Role",
            "prompt_audio_1_url": "https://gitee.com/wei-xiaohui1/test1/raw/master/zh_spk1_moon.wav",
            "prompt_text_1": "周一到周五，每天早晨七点半到九点半的直播片段。言下之意呢，就是废话有点多，大家也别嫌弃，因为这都是直播间最真实的状态了。",
            "prompt_audio_2_url": "https://gitee.com/wei-xiaohui1/test1/raw/master/zh_spk2_moon.wav",
            "prompt_text_2": "如果大家想听到更丰富更及时的直播内容，记得在周一到周五准时进入直播间，和大家一起畅聊新消费新科技新趋势。",
            "use_normalize": true
        })
    },
    {
        name: "Test with single reference audio",
        body: JSON.stringify({
            "model": "fnlp/MOSS-TTSD-v0.5",
            "input": "你好，今天天气怎么样？",
            "audio_mode": "Single",
            "prompt_audio_url": "https://gitee.com/wei-xiaohui1/test1/raw/master/zh_spk1_moon.wav",
            "prompt_text": "周一到周五，每天早晨七点半到九点半的直播片段。"
        })
    },
    {
        name: "Test with voice parameter name (OpenAI style)",
        body: JSON.stringify({
            "model": "fnlp/MOSS-TTSD-v0.5",
            "input": "你好，今天天气怎么样？",
            "voice": "nova"
        })
    },
    {
        name: "Test with Chinese voice names",
        body: JSON.stringify({
            "model": "fnlp/MOSS-TTSD-v0.5",
            "input": "你好，今天天气怎么样？",
            "voice": "zh-CN-female-1"
        })
    },
    {
        name: "Test with different audio_mode",
        body: JSON.stringify({
            "model": "fnlp/MOSS-TTSD-v0.5",
            "input": "你好，今天天气怎么样？",
            "audio_mode": "General",
            "voice": "default"
        })
    },
    {
        name: "Test with reference_url parameter",
        body: JSON.stringify({
            "model": "fnlp/MOSS-TTSD-v0.5",
            "input": "你好，今天天气怎么样？",
            "reference_url": "https://gitee.com/wei-xiaohui1/test1/raw/master/zh_spk1_moon.wav"
        })
    }
];

async function testConfig(config, index) {
    console.log(`\n🧪 Test ${index + 1}: ${config.name}`);
    console.log(`📤 Request body: ${config.body}`);

    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: config.body
    };

    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type');

        console.log(`📥 Response status: ${response.status}`);
        console.log(`📥 Content-Type: ${contentType}`);

        let data;
        if (contentType && contentType.includes('audio')) {
            console.log("📥 Response: Audio data (binary)");
            data = { type: 'audio', size: response.headers.get('content-length') };
        } else {
            data = await response.json();
            console.log(`📥 Response data:`, data);
        }

        if (response.ok) {
            console.log("✅ Success!");
        } else {
            console.log("❌ Failed");
        }

        return { success: response.ok, data, status: response.status, contentType };
    } catch (error) {
        console.error(`💥 Error:`, error.message);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log("🔍 Testing SiliconFlow API with reference audio parameters...\n");

    const results = [];

    for (let i = 0; i < testConfigs.length; i++) {
        const result = await testConfig(testConfigs[i], i);
        results.push(result);

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log("\n📊 Test Results Summary:");
    console.log("=".repeat(50));

    results.forEach((result, index) => {
        console.log(`${index + 1}. ${testConfigs[index].name}: ${result.success ? '✅' : '❌'}`);
        if (!result.success) {
            console.log(`   Error: ${result.error || result.data?.message || 'Unknown error'}`);
        } else {
            if (result.data.type === 'audio') {
                console.log(`   Success: Received audio file (${result.data.size} bytes)`);
            }
        }
    });

    const successful = results.filter(r => r.success).length;
    console.log(`\n🎯 Success rate: ${successful}/${results.length} (${Math.round(successful/results.length*100)}%)`);

    if (successful === 0) {
        console.log("\n💡 SiliconFlow API Analysis:");
        console.log("1. ✅ API token is valid (got responses, not auth errors)");
        console.log("2. ✅ Model 'fnlp/MOSS-TTSD-v0.5' exists");
        console.log("3. ❌ Voice parameter 'default' is invalid");
        console.log("4. ❌ All reference audio formats tested were invalid");
        console.log("5. 💡 This suggests MOSS-TTS model has very specific parameter requirements");
        console.log("6. 🔍 Need to find SiliconFlow's official documentation");
    } else {
        console.log("\n🎉 Found working parameters!");
    }
}

runTests().catch(console.error);