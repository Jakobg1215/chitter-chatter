import Chat from "@jsprismarine/prismarine/dist/src/chat/Chat";
import ChatEvent from "@jsprismarine/prismarine/dist/src/events/chat/ChatEvent";
import type PluginApi from "@jsprismarine/prismarine/dist/src/plugin/api/versions/1.0/PluginApi";
export default class HelloWorldPlugin {
    public api: PluginApi;
    public constructor(api: PluginApi) {
        this.api = api;
    }
    public async onEnable() {
        const chatSettings = await this.buildChatSettings();
        await this.api.getEventManager().on("chat", async (event: ChatEvent) => {
            const sender = event.getChat().getSender();
            const message = event.getChat().getMessage();
            if (!sender.isPlayer()) return;
            if (!chatSettings.enabled) return;
            if (chatSettings.blockColoredText) {
                if (message.includes("§")) {
                    event.preventDefault();
                    const newMessage: string[] = [];
                    // TODO: Make this split infront of §
                    message.split(" ").forEach(async (word: string) => {
                        if (word.startsWith("§")) return newMessage.push(word.replace("§", "").slice(1));
                        return newMessage.push(word);
                    });
                    // TODO: Make this not use new ChatEvent and new Chat
                    return await this.api.getEventManager().emit("chat", new ChatEvent(new Chat(sender, newMessage.join(" "))));
                }
            }
            if (chatSettings.bannedWords.length) {
                message.split(" ").forEach(async (word: string) => {
                    if (chatSettings.bannedWords.includes(word)) {
                        await sender.sendMessage("§cYour message contains a banned word!");
                        return event.preventDefault();
                    }
                });
            }
            if (chatSettings.uppercaseLimit > 0) {
                if ((message.match(/[A-Z]/g) ?? []).length >= chatSettings.uppercaseLimit) {
                    await sender.sendMessage("§cYour message contains too many capital letter!");
                    return event.preventDefault();
                }
            }
            if (chatSettings.characterLimit > 0) {
                if (message.length >= chatSettings.characterLimit) {
                    await sender.sendMessage("§cYour message was too long!");
                    return event.preventDefault();
                }
            }
            const timeOuts: any[] = this.api.getConfigBuilder("messagesTimeOut.json").get("timeOuts", []);
            console.log(chatSettings.messageTimeout);
            if (chatSettings.messageTimeout > 0) {
                // FIXME: Fix this so it will work
                console.log(timeOuts.find(timeOut => timeOut.sender === sender.getName()));
                if (timeOuts.find(timeOut => timeOut.sender === sender.getName())) {
                    if (timeOuts.find(timeOut => new Date().getTime() <= timeOut.time + chatSettings.messageTimeout)) {
                        console.log(timeOuts.filter(timeOut => timeOut.sender === sender.getName()));
                        this.api.getConfigBuilder("messagesTimeOut.json").set("timeOuts", timeOuts.filter(timeOut => timeOut.sender === sender.getName()));
                    }
                    else {
                        await sender.sendMessage("§cYou can say a message!");
                        return event.preventDefault();
                    }
                }
            }
            timeOuts.push({ sender: sender.getName(), time: new Date().getTime() });
            this.api.getConfigBuilder("messagesTimeOut.json").set("timeOuts", timeOuts);
        });
    }
    public async onDisable() { }
    private async buildChatSettings() {
        const settingsFile = this.api.getConfigBuilder("config.yaml");
        const settings = {
            enabled: true,
            blockColoredText: false,
            bannedWords: ["word"],
            uppercaseLimit: 0,
            characterLimit: 0,
            messageTimeout: 0
        };
        Object.assign(settings, { enabled: settingsFile.get("enabled", true) });
        Object.assign(settings, { blockColoredText: settingsFile.get("block-colored-text", false) });
        Object.assign(settings, { bannedWords: settingsFile.get("banned-words", ["word"]) });
        Object.assign(settings, { uppercaseLimit: settingsFile.get("uppercase-limit", 0) });
        Object.assign(settings, { characterLimit: settingsFile.get("character-limit", 0) });
        Object.assign(settings, { messageTimeout: settingsFile.get("message-timeout", 0) * 1000 });
        return settings;
    }
}
