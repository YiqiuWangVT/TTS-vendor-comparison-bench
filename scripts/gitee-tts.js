import fs from "fs";
import open from "open";

const API_URL = "https://ai.gitee.com/v1/async/audio/speech";
const API_TOKEN = "FB8F11UGSXAMARF1TZLJJA82D4KOBY1CLMS6JD13";
const headers = {
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json"
}

async function query(data) {
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

async function pollTask(taskId) {
    const statusUrl = `https://ai.gitee.com/v1/task/${taskId}`;
    const retryInterval = 10 * 1000;
    const maxAttempts = (30 * 60) / 10;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        process.stdout.write(`Checking task status [${attempt}]...`);
        const response = await fetch(statusUrl, { headers });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
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
                await open(result.output.file_url);
            } else {
                console.log("⚠️ No output URL found");
            }
        } else if (["failed", "cancelled"].includes(status)) {
            console.log(`❌ Task ${status}`);
        } else {
            await new Promise((resolve) => setTimeout(resolve, retryInterval));
            continue;
        }

        const taskFile = `task_${taskId}.json`;
        fs.writeFileSync(taskFile, JSON.stringify(result, null, 4));
        console.log(`Task saved to ${taskFile}`);
        return result;
    }

    console.log(`⏰ Maximum attempts reached (${maxAttempts})`);
    return { status: "timeout", message: "Maximum wait time exceeded" };
}

async function generate() {
    console.log("Creating task...");
    const result = await query({
        "inputs": "[S1]诶，我最近看了一篇讲人工智能的文章，还挺有意思的，想跟你聊聊。[S2]哦？是吗，关于啥的啊？又是哪个公司发了什么逆天的新模型吗？[S1]那倒不是，是一个咱们国内的教授，复旦大学的邱锡鹏教授，他提了一个新概念，叫什么，呃，叫情境扩展，Context Scaling。[S2]Context Scaling？情境扩展？听起来有点，呃，有点玄乎啊，这是个啥意思？[S1]对，我一开始也觉得有点抽象，但你看完就觉得，诶，特别有道理。他大概意思就是说啊，咱们现在对人工智能的追求，不能光是把它做得更大，你知道吧，就是不能光堆参数，喂数据。[S2]嗯，是，这个我懂。就好像之前大家都在比谁的模型参数多，几千亿，上万亿的。[S1]对对对，就是那个意思。他说那个时代，算是第一幕，就是模型规模化的胜利，靠堆料，堆出了像这个ChatGPT这样厉害的通用模型。[S2]嗯，是的。[S1]然后呢，现在差不多是第二幕，就是大家发现光堆料好像不行了，收益越来越小，就开始搞一些，呃，后训练的优化。[S2]哦，后训练优化？比如呢？[S1]比如让AI学会用工具，或者搞那个什么思维链，让它像人一样一步一步思考问题，还有就是强化学习，让它自己在游戏里或者写代码的时候自己跟自己玩，然后越变越强。[S2]哦，明白了。就是让它不光是知识多，还得会用，变得更聪明，是这个意思吧。[S1]没错，就是这个理儿。但是呢，这两步走完了，就遇到了新的瓶颈。邱教授就觉得，关键问题出在了这个情境，也就是Context上。[S2]嗯？情境？[S1]是。很多时候AI做不出正确的决定，不是因为它笨，而是因为它没搞明白现在到底是个什么情况，就是我们给它的任务或者情境描述得不够清楚。[S2]哦，原来是这样。[S1]对。所以他觉得下一幕，也就是第三幕，就应该是这个情境扩展，Context Scaling。核心就是要让AI能真正理解那种特别复杂、多变，甚至有点模糊的真实世界的情境。[S2]嗯，这个听起来就高级了。那他说的这个情境，到底指什么啊？不就是我们输进去的那段话吗？[S1]诶，不是那么简单的。他说的情境啊，是个特别立体的东西。它不光包括你说了什么，还包括，呃，时间，地点，谁在说话，目的是什么，甚至还包括咱们文化里那种只可意会不可言传的规则，还有人与人之间的那种默契。[S2]哇，那这个范围可太广了。[S1]是吧。他举了个例子，就比如说，当一个人说不要的时候。[S2]嗯。[S1]你想想，在不同的情况下，这个不要的意思完全不一样。有可能是真的拒绝，也可能是在开玩笑，甚至可能是一种反向的请求，就是我们说的口是心非，嘴上说不要，身体很诚实那种。[S2]哈哈，确实确实，这个AI可怎么判断啊。[S1]对啊，所以就需要理解整个情境。他说这个里面最关键的，就是要捕获一种叫暗知识的东西。[S2]暗知识？听着像武林秘籍一样。[S1]有点那个意思。就是指我们人类会，但是很难用语言清楚地讲出来的那些能力。[S2]哦？比如说？[S1]比如说社交的智慧啊，怎么通过一个眼神，一个停顿，或者语气变化来理解对方的意思。[S2]嗯，是的。[S1]还有就是文化适应能力，在不同的文化里，有些事能做，有些事不能做，这些都没人写在书上，但我们就是知道。[S2]没错。[S1]他说AI要是能学会这些，那才算是真正的智能突破了。这也能解决一些AI安全的问题，比如那个很有名的回形针悖论。[S2]哦，那个我知道，就是你让AI造回形针，它最后可能会为了这个目标把整个世界都给占了，用来造回形针。[S1]对。但如果它有情境智能，它就能理解我们人类社会的复杂性，知道有些事是不能做的，就算你没有明确下指令禁止它。[S2]有道理，有道理。那，那技术上要怎么实现呢？听起来好难啊。[S1]是挺难的。他提了三大技术支柱。第一个叫强交互性。就是AI要不停地跟环境，特别是跟人来互动学习，不光要知道怎么做，还要知道为什么这么做。[S2]嗯，在互动里学习。[S1]第二个叫具身性。就是AI得有个身体，不一定是真的人形机器人，在虚拟世界里也行，总之它得能感知和行动。[S2]哦，明白。[S1]第三个，我觉得是最特别的，叫拟人化。[S2]拟人化？[S1]对，就是说AI需要有类似人类的情感共鸣能力。不是假装有感情，而是真正理解人的情绪，人的偏好，懂得社交的距离感，什么时候该关心，什么时候该保持沉默。[S2]哇，这个要求可太高了，感觉比养个孩子还难。[S1]哈哈，可不是嘛。所以他说这事儿吧，不是要去替代其他的技术路线，而是把它们都整合起来。像什么推理增强啊，多模态啊，强化学习啊，最终都是为了服务于一个目标，就是让AI能深刻地理解情境。[S2]嗯。[S1]所以总的来说，就是别光在已有的路上卷了，要去定义一些大家都觉得重要，但没人说清楚的问题。[S2]确实。听你这么一说，感觉这个情境扩展，Context Scaling，确实给人工智能指了一个挺不一样的方向。不再是冷冰冰的计算，而是要变得更懂我们人类，更懂这个复杂的世界。[S1]是啊，他说这可能是通往通用人工智能，就是AGI，非常关键的一步。[S2]嗯，听起来未来可期啊。",
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
        // Do something with the task result if needed
        console.log("Task completed successfully.");
    }
}

generate();