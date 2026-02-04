const url = 'https://api.siliconflow.cn/v1/audio/speech';
const API_TOKEN = 'sk-emqroezspvruhjyqdrevnrtuczwkubcebuuuletsclekplfp';

// Test different parameter combinations
const testConfigs = [
    {
        name: "Basic test (original)",
        body: '{"model":"fnlp/MOSS-TTSD-v0.5","input":"[S1]Hello, how are you today?[S2]I\'m doing great, thanks for asking![S1]That\'s wonderful to hear "}'
    },
    {
        name: "Test with simple voice parameter",
        body: '{"model":"fnlp/MOSS-TTSD-v0.5","input":"Hello world","voice":"default"}'
    },
    {
        name: "Test with Chinese text",
        body: '{"model":"fnlp/MOSS-TTSD-v0.5","input":"你好世界","voice":"default"}'
    },
    {
        name: "Test without speaker tags",
        body: '{"model":"fnlp/MOSS-TTSD-v0.5","input":"Hello, how are you today?","voice":"default"}'
    },
    {
        name: "Test with different model",
        body: '{"model":"tts-1","input":"Hello world","voice":"alloy"}'
    },
    {
        name: "Test with response_format",
        body: '{"model":"fnlp/MOSS-TTSD-v0.5","input":"Hello world","response_format":"wav"}'
    },
    {
        name: "Test with speed parameter",
        body: '{"model":"fnlp/MOSS-TTSD-v0.5","input":"Hello world","voice":"default","speed":1.0}'
    }
];

async function testConfig(config: { name: string; body: string }, index: number) {
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
        const data = await response.json();

        console.log(`📥 Response status: ${response.status}`);
        console.log(`📥 Response data:`, data);

        if (response.ok) {
            console.log("✅ Success!");
        } else {
            console.log("❌ Failed");
        }

        return { success: response.ok, data, status: response.status };
    } catch (error: any) {
        console.error(`💥 Error:`, error.message);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log("🔍 Testing SiliconFlow API parameter combinations...\n");

    const results = [];

    for (let i = 0; i < testConfigs.length; i++) {
        const result = await testConfig(testConfigs[i], i);
        results.push(result);

        // Add small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log("\n📊 Test Results Summary:");
    console.log("=" .repeat(50));

    results.forEach((result, index) => {
        console.log(`${index + 1}. ${testConfigs[index].name}: ${result.success ? '✅' : '❌'}`);
        if (!result.success) {
            console.log(`   Error: ${result.error || result.data?.message || 'Unknown error'}`);
        }
    });

    const successful = results.filter(r => r.success).length;
    console.log(`\n🎯 Success rate: ${successful}/${results.length} (${Math.round(successful/results.length*100)}%)`);

    if (successful === 0) {
        console.log("\n💡 Suggestions:");
        console.log("1. Check if the API token is valid");
        console.log("2. Verify the model name 'fnlp/MOSS-TTSD-v0.5' is correct");
        console.log("3. Try different voice parameters");
        console.log("4. Check if the input format needs to be different");
        console.log("5. Look for SiliconFlow API documentation for correct parameter names");
    }
}

runTests().catch(console.error);