// Test SiliconFlow integration with the main API
const url = 'http://localhost:3000/api/tts';

const testPayload = {
  text: "你好，这是测试 SiliconFlow OpenMOSS 集成的语音合成。",
  language: "zh-CN",
  providers: ["siliconflow"],
  models: {
    siliconflow: "fnlp/MOSS-TTSD-v0.5"
  },
  voices: {
    siliconflow: "anna"
  }
};

async function testSiliconFlowIntegration() {
  console.log("🧪 Testing SiliconFlow TTS API Integration...");
  console.log("📤 Request payload:", JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const responseData = await response.json();
    console.log("📥 Response status:", response.status);
    console.log("📥 Response data:", JSON.stringify(responseData, null, 2));

    if (responseData.results && responseData.results.length > 0) {
      const result = responseData.results[0];
      if (result.status === "success") {
        console.log("✅ SUCCESS: SiliconFlow TTS integration working!");
        console.log("📊 Audio info:");
        console.log("   - Provider:", result.provider);
        console.log("   - Audio bytes:", result.audioBytes);
        console.log("   - Audio duration:", result.audioDurationSeconds, "seconds");
        console.log("   - TTFB:", result.metrics.backend.ttfbMs, "ms");
        console.log("   - Source:", result.source);
      } else {
        console.log("❌ ERROR: SiliconFlow TTS failed");
        console.log("   Error:", result.error);
      }
    } else {
      console.log("❌ ERROR: No results returned");
      console.log("   Response:", responseData);
    }
  } catch (error) {
    console.error("💥 CRITICAL ERROR:", error);
  }
}

// Run the test
testSiliconFlowIntegration();