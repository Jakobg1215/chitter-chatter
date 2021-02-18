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
                    const messageArray: string[] = Array.from(message);
                    messageArray.forEach((value, index) => {
                        if (value === "§") return;
                        if (!value.match(/[a-r0-9]/)) return newMessage.push(value);
                        if (messageArray[index - 1] === "§") return;
                        return newMessage.push(value);
                    });
                    // TODO: Make this not use new ChatEvent and new Chat
                    return await this.api.getEventManager().emit("chat", new ChatEvent(new Chat(sender, newMessage.join(""))));
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
            if (chatSettings.messageTimeout > 0) {
                const timeOuts: any[] = this.api.getConfigBuilder("messagesTimeOut.json").get("timeOuts", []);
                const msgTimeOut = timeOuts.find(timeOut => timeOut.sender === sender.getName());
                if (!msgTimeOut) {
                    timeOuts.push({ sender: sender.getName(), time: new Date().getTime() });
                    return this.api.getConfigBuilder("messagesTimeOut.json").set("timeOuts", timeOuts);
                }
                if ((Date.now() - msgTimeOut?.time) <= chatSettings.messageTimeout) {
                    event.preventDefault();
                    return sender.sendMessage("§cYou can't say a message yet!");
                }
                const newTimeOuts = timeOuts.filter(timeOut => timeOut.sender !== sender.getName());
                newTimeOuts.push({ sender: sender.getName(), time: new Date().getTime() });
                return this.api.getConfigBuilder("messagesTimeOut.json").set("timeOuts", newTimeOuts);
            }
        });
    }
    public async onDisable() {
        this.api.getConfigBuilder("messagesTimeOut.json").set("timeOuts", []);
    }
    private async buildChatSettings() {
        const getSetting = this.api.getConfigBuilder("config.yaml").get;
        const settings = {
            enabled: true,
            blockColoredText: false,
            bannedWords: ["word"],
            uppercaseLimit: 0,
            characterLimit: 0,
            messageTimeout: 0
        };
        Object.assign(settings, { enabled: getSetting("enabled", true) });
        Object.assign(settings, { blockColoredText: getSetting("block-colored-text", false) });
        Object.assign(settings, { bannedWords: getSetting("banned-words", ["word"]) });
        Object.assign(settings, { uppercaseLimit: getSetting("uppercase-limit", 0) });
        Object.assign(settings, { characterLimit: getSetting("character-limit", 0) });
        Object.assign(settings, { messageTimeout: getSetting("message-timeout", 0) * 1000 });
        return settings;
    }
}
