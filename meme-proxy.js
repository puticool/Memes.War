const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');
const printLogo = require('./src/logo');

class MemesWar {
    constructor() {
        this.headers = {
            "accept": "*/*",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en-US,en;q=0.9",
            "referer": "https://memes-war.memecore.com/",
            "sec-ch-ua": '"Chromium";v="130", "Not?A_Brand";v="99"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
        };        
        this.proxyList = [];
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [✗] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i > 0; i--) {
            const timestamp = new Date().toLocaleTimeString();
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[${timestamp}] [*] Waiting ${i} seconds to continue...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', {
                httpsAgent: proxyAgent
            });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Unable to check proxy IP. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error checking proxy IP: ${error.message}`);
        }
    }

    getAxiosConfig(proxyUrl) {
        return {
            headers: this.headers,
            httpsAgent: new HttpsProxyAgent(proxyUrl)
        };
    }

    async getUserInfo(telegramInitData, proxyUrl) {
        const url = "https://memes-war.memecore.com/api/user";
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };
    
        try {
            const response = await axios.get(url, config);
            if (response.status === 200 && response.data.data) {
                const userData = response.data.data.user;
                
                if (!userData.inputReferralCode) {
                    try {
                        await axios.put(
                            "https://memes-war.memecore.com/api/user/referral/3W0YZN",
                            {},
                            config
                        );
                        this.log("Successfully entered referral code", 'success');
                    } catch (referralError) {
                        this.log(`Unable to enter referral code: ${referralError.message}`, 'error');
                    }
                }
    
                return { success: true, data: userData };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async checkTreasuryRewards(telegramInitData, proxyUrl) {
        const url = "https://memes-war.memecore.com/api/quest/treasury/rewards";
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };

        try {
            const response = await axios.get(url, config);
            if (response.status === 200 && response.data.data) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async claimTreasuryRewards(telegramInitData, proxyUrl) {
        const url = "https://memes-war.memecore.com/api/quest/treasury";
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };

        try {
            const response = await axios.post(url, {}, config);
            if (response.status === 200 && response.data.data) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processTreasury(telegramInitData, proxyUrl) {
        const checkResult = await this.checkTreasuryRewards(telegramInitData, proxyUrl);
        if (!checkResult.success) {
            this.log(`Unable to check $War.Bond: ${checkResult.error}`, 'error');
            return;
        }

        const { leftSecondsUntilTreasury, rewards } = checkResult.data;
        
        if (leftSecondsUntilTreasury === 0) {
            this.log('Claiming $War.Bond...', 'info');
            const claimResult = await this.claimTreasuryRewards(telegramInitData, proxyUrl);
            
            if (claimResult.success) {
                const rewardAmount = claimResult.data.rewards[0].rewardAmount;
                this.log(`Successfully claimed ${rewardAmount} $War.Bond`, 'success');
                this.log(`Time to wait for the next claim: ${claimResult.data.leftSecondsUntilTreasury} seconds`, 'info');
            } else {
                this.log(`Unable to claim $War.Bond: ${claimResult.error}`, 'error');
            }
        } else {
            this.log(`Not yet time to claim $War.Bond (remaining ${leftSecondsUntilTreasury} seconds)`, 'warning');
        }
    }

    async checkCheckInStatus(telegramInitData, proxyUrl) {
        const url = "https://memes-war.memecore.com/api/quest/check-in";
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };

        try {
            const response = await axios.get(url, config);
            if (response.status === 200 && response.data.data) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async performCheckIn(telegramInitData, proxyUrl) {
        const url = "https://memes-war.memecore.com/api/quest/check-in";
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };

        try {
            const response = await axios.post(url, {}, config);
            if (response.status === 200 && response.data.data) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processCheckIn(telegramInitData, proxyUrl) {
        const checkResult = await this.checkCheckInStatus(telegramInitData, proxyUrl);
        if (!checkResult.success) {
            this.log(`Unable to check check-in status: ${checkResult.error}`, 'error');
            return;
        }

        const { checkInRewards } = checkResult.data;
        const claimableReward = checkInRewards.find(reward => reward.status === 'CLAIMABLE');

        if (claimableReward) {
            this.log('Proceeding with check-in...', 'info');
            const checkInResult = await this.performCheckIn(telegramInitData, proxyUrl);
            
            if (checkInResult.success) {
                const { currentConsecutiveCheckIn, rewards } = checkInResult.data;
                const rewardText = rewards.map(reward => {
                    if (reward.rewardType === 'WARBOND') {
                        return `${reward.rewardAmount} $War.Bond`;
                    } else if (reward.rewardType === 'HONOR_POINT') {
                        return `${reward.rewardAmount} Honor Points`;
                    }
                    return `${reward.rewardAmount} ${reward.rewardType}`;
                }).join(' + ');
                
                this.log(`Check-in successful for day ${currentConsecutiveCheckIn} | Rewards: ${rewardText}`, 'success');
            } else {
                this.log(`Check-in failed: ${checkInResult.error}`, 'error');
            }
        } else {
            this.log('Already checked in today', 'warning');
        }
    }

    async checkGuildStatus(telegramInitData, proxyUrl, guildId) {
        const url = `https://memes-war.memecore.com/api/guild/${guildId}`;
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };

        try {
            const response = await axios.get(url, config);
            if (response.status === 200 && response.data.data) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async checkFavoriteGuilds(telegramInitData, proxyUrl) {
        const url = "https://memes-war.memecore.com/api/guild/list/favorite?start=0&count=10";
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };

        try {
            const response = await axios.get(url, config);
            if (response.status === 200 && response.data.data) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async favoriteGuild(telegramInitData, proxyUrl, guildId) {
        const url = "https://memes-war.memecore.com/api/guild/favorite";
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };

        try {
            const response = await axios.post(url, { guildId }, config);
            if (response.status === 200) {
                return { success: true };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async transferWarbondToGuild(telegramInitData, proxyUrl, guildId, warbondCount) {
        const url = "https://memes-war.memecore.com/api/guild/warbond";
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };

        try {
            const response = await axios.post(url, { guildId, warbondCount }, config);
            if (response.status === 200) {
                return { success: true };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processGuildOperations(telegramInitData, proxyUrl) {
        const TARGET_GUILD_ID = "f8986b67-a906-4dd2-8aec-91aaf3418c56";
        const MIN_WARBOND_THRESHOLD = 1000;

        const userInfoResult = await this.getUserInfo(telegramInitData, proxyUrl);
        if (!userInfoResult.success) {
            this.log(`Unable to retrieve user information: ${userInfoResult.error}`, 'error');
            return;
        }

        const warbondTokens = parseInt(userInfoResult.data.warbondTokens);
        if (warbondTokens <= MIN_WARBOND_THRESHOLD) {
            this.log(`Insufficient $War.Bond balance (${warbondTokens}) to transfer`, 'warning');
            return;
        }

        const guildStatus = await this.checkGuildStatus(telegramInitData, proxyUrl, TARGET_GUILD_ID);
        if (guildStatus.success) {
            this.log(`Guild ${guildStatus.data.name}: ${guildStatus.data.warbondTokens} $War.Bond`, 'custom');
        }

        const favoriteGuilds = await this.checkFavoriteGuilds(telegramInitData, proxyUrl);
        if (favoriteGuilds.success) {
            const isGuildFavorited = favoriteGuilds.data.guilds.some(guild => guild.guildId === TARGET_GUILD_ID);
            if (!isGuildFavorited) {
                this.log('Adding guild to favorites...', 'info');
                await this.favoriteGuild(telegramInitData, proxyUrl, TARGET_GUILD_ID);
            }
        }

        this.log(`Transferring ${warbondTokens} $War.Bond to guild...`, 'info');
        const transferResult = await this.transferWarbondToGuild(telegramInitData, proxyUrl, TARGET_GUILD_ID, warbondTokens.toString());
        if (transferResult.success) {
            this.log(`Successfully transferred ${warbondTokens} $War.Bond`, 'success');
        } else {
            this.log(`Unable to transfer $War.Bond: ${transferResult.error}`, 'error');
        }
    }

    async getQuests(telegramInitData, proxyUrl) {
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };

        try {
            const [dailyResponse, singleResponse] = await Promise.all([
                axios.get("https://memes-war.memecore.com/api/quest/daily/list", config),
                axios.get("https://memes-war.memecore.com/api/quest/single/list", config)
            ]);
    
            if (dailyResponse.status === 200 && singleResponse.status === 200) {
                const dailyQuests = dailyResponse.data.data.quests.map(quest => ({ ...quest, questType: 'daily' }));
                const singleQuests = singleResponse.data.data.quests.map(quest => ({ ...quest, questType: 'single' }));
                
                return { success: true, data: [...dailyQuests, ...singleQuests] };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async submitQuestProgress(telegramInitData, proxyUrl, questType, questId) {
        const url = `https://memes-war.memecore.com/api/quest/${questType}/${questId}/progress`;
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };
    
        try {
            const response = await axios.post(url, {}, config);
            if (response.status === 200 && response.data.data) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async processQuests(telegramInitData, proxyUrl) {
        const questsResult = await this.getQuests(telegramInitData, proxyUrl);
        if (!questsResult.success) {
            this.log(`Unable to retrieve quest list: ${questsResult.error}`, 'error');
            return;
        }
    
        const pendingQuests = questsResult.data.filter(quest => quest.status === 'GO');
        if (pendingQuests.length === 0) {
            this.log('No quests to complete', 'warning');
            return;
        }
    
        for (const quest of pendingQuests) {
            this.log(`Completing quest ${quest.title}`, 'info');

            let result = await this.submitQuestProgress(telegramInitData, proxyUrl, quest.questType, quest.id);
            if (!result.success || result.data.status !== 'VERIFY') {
                this.log(`Unable to complete quest ${quest.title}: ${result.error || 'Invalid status'}`, 'error');
                continue;
            }
    
            await this.countdown(3);

            result = await this.submitQuestProgress(telegramInitData, proxyUrl, quest.questType, quest.id);
            if (!result.success || result.data.status !== 'CLAIM') {
                this.log(`Unable to complete quest ${quest.title}: ${result.error || 'Invalid status'}`, 'error');
                continue;
            }
    
            await this.countdown(3);
    
            result = await this.submitQuestProgress(telegramInitData, proxyUrl, quest.questType, quest.id);
            if (!result.success || result.data.status !== 'DONE') {
                this.log(`Unable to complete quest ${quest.title}: ${result.error || 'Invalid status'}`, 'error');
                continue;
            }

            const rewards = result.data.rewards.map(reward => {
                if (reward.rewardType === 'WARBOND') {
                    return `${reward.rewardAmount} $War.Bond`;
                }
                return `${reward.rewardAmount} ${reward.rewardType}`;
            }).join(' + ');
    
            this.log(`Successfully completed quest ${quest.title} | Rewards: ${rewards}`, 'success');
        }
    }

    async checkPreorder(telegramInitData, proxyUrl) {
        const url = "https://memes-war.memecore.com/api/user/my/preorder";
        const config = {
            ...this.getAxiosConfig(proxyUrl),
            headers: {
                ...this.headers,
                "cookie": `telegramInitData=${telegramInitData}`
            }
        };

        try {
            const response = await axios.get(url, config);
            if (response.status === 200) {
                return { success: true };
            } else {
                return { success: false, error: 'Invalid response format' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const proxyFile = path.join(__dirname, 'proxy.txt');

        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        this.proxyList = fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
        
        printLogo();

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const initData = data[i];
                const proxyUrl = this.proxyList[i];
                const userData = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0]));
                const firstName = userData.first_name;
                const telegramInitData = encodeURIComponent(encodeURI(decodeURIComponent(initData)));
                
                let proxyIP = "Unknown";
                try {
                    proxyIP = await this.checkProxyIP(proxyUrl);
                } catch (error) {
                    this.log(`Error checking proxy IP: ${error.message}`, 'error');
                    continue;
                }

                console.log(`========== Account ${i + 1} | ${firstName.green} | IP: ${proxyIP} ==========`);

                try {
                    const userInfoResult = await this.getUserInfo(telegramInitData, proxyUrl);
                    if (userInfoResult.success) {
                        const { honorPoints, warbondTokens, honorPointRank } = userInfoResult.data;
                        this.log(`Honor Points: ${honorPoints}`, 'success');
                        this.log(`Warbond Tokens: ${warbondTokens}`, 'success');
                        this.log(`Honor Point Rank: ${honorPointRank}`, 'success');
                    } else {
                        this.log(`Unable to retrieve user information: ${userInfoResult.error}`, 'error');
                    }

                    await this.processCheckIn(telegramInitData, proxyUrl);
                    await this.processTreasury(telegramInitData, proxyUrl);
                    await this.processQuests(telegramInitData, proxyUrl);
                    await this.processGuildOperations(telegramInitData, proxyUrl);
                } catch (error) {
                    this.log(`Error processing account ${firstName}: ${error.message}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(65 * 60);
        }
    }
}

const client = new MemesWar();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});