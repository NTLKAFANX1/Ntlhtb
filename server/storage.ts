import { type User, type InsertUser, type Bot, type InsertBot, type AiChat, type InsertAiChat, type ScrapedData, type InsertScrapedData, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { type Project, type InsertProject, type ProjectSearch } from "@shared/projectSchema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getBots(): Promise<Bot[]>;
  getBot(id: string): Promise<Bot | undefined>;
  createBot(bot: InsertBot): Promise<Bot>;
  updateBot(id: string, bot: Partial<Bot>): Promise<Bot | undefined>;
  deleteBot(id: string): Promise<boolean>;

  getAiChats(botId: string): Promise<AiChat[]>;
  createAiChat(chat: InsertAiChat): Promise<AiChat>;
  deleteAiChat(id: string): Promise<boolean>;

  getProjects(search?: ProjectSearch): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  incrementProjectDownloads(id: string): Promise<void>;

  // Scraped data methods
  getScrapedData(): Promise<ScrapedData[]>;
  getScrapedDataItem(id: string): Promise<ScrapedData | undefined>;
  createScrapedData(data: InsertScrapedData): Promise<ScrapedData>;
  updateScrapedData(id: string, data: Partial<ScrapedData>): Promise<ScrapedData | undefined>;
  deleteScrapedData(id: string): Promise<boolean>;

  // Chat message methods
  getChatMessages(): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatMessages(): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private bots: Map<string, Bot>;
  private aiChats: Map<string, AiChat>;
  private projects: Map<string, Project>;
  private scrapedData: Map<string, ScrapedData>;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.users = new Map();
    this.bots = new Map();
    this.aiChats = new Map();
    this.projects = new Map();
    this.scrapedData = new Map();
    this.chatMessages = new Map();
    this.initializeSampleProjects();
    this.initializeSampleData();
  }

  private initializeSampleProjects() {
    const sampleProjects: Project[] = [
      {
        id: "welcome-bot",
        name: "بوت الترحيب المتقدم",
        description: "بوت ترحيب متكامل مع رسائل مخصصة وإحصائيات",
        category: "utility",
        tags: ["ترحيب", "إحصائيات", "مبتدئ"],
        files: {
          "index.js": `const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const welcomeStats = new Map();

client.once(Events.ClientReady, () => {
    console.log('🎉 بوت الترحيب جاهز!');
});

client.on(Events.GuildMemberAdd, member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'general' || ch.name === 'welcome');
    if (channel) {
        const memberCount = member.guild.memberCount;
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎉 عضو جديد!')
            .setDescription(\`مرحباً \${member.user.username}! أهلاً بك في \${member.guild.name}\`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields({ name: 'عدد الأعضاء', value: \`\${memberCount}\`, inline: true })
            .setTimestamp();

        channel.send({ content: \`\${member}\`, embeds: [embed] });

        // إحصائيات الترحيب
        const count = welcomeStats.get(member.guild.id) || 0;
        welcomeStats.set(member.guild.id, count + 1);
    }
});

client.on(Events.MessageCreate, message => {
    if (message.author.bot) return;

    if (message.content === '!ترحيب_احصائيات') {
        const count = welcomeStats.get(message.guild.id) || 0;
        message.reply(\`📊 تم ترحيب \${count} عضو حتى الآن!\`);
    }
});

client.login('YOUR_BOT_TOKEN');`
        },
        author: "فريق التطوير",
        verified: true,
        downloads: 245,
        rating: 4.8,
        ratingCount: 32,
        createdAt: new Date(),
      },
      {
        id: "ticket-system",
        name: "نظام التذاكر المحترف",
        description: "نظام تذاكر متكامل مع أزرار وقوائم منسدلة",
        category: "moderation",
        tags: ["تذاكر", "إدارة", "دعم"],
        files: {
          "index.js": `const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const activeTickets = new Map();

client.once(Events.ClientReady, () => {
    console.log('🎫 نظام التذاكر جاهز!');
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (message.content === '!ticket_setup') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ تحتاج صلاحية إدارة القنوات!');
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🎫 نظام التذاكر')
            .setDescription('اضغط على الزر أدناه لإنشاء تذكرة جديدة');

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('🎫 إنشاء تذكرة')
                    .setStyle(ButtonStyle.Primary)
            );

        message.channel.send({ embeds: [embed], components: [button] });
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket') {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // تحقق من وجود تذكرة مفتوحة
        if (activeTickets.has(\`\${guildId}_\${userId}\`)) {
            return interaction.reply({ content: '❌ لديك تذكرة مفتوحة بالفعل!', ephemeral: true });
        }

        // إنشاء قناة التذكرة
        const ticketChannel = await interaction.guild.channels.create({
            name: \`ticket-\${interaction.user.username}\`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }
            ]
        });

        activeTickets.set(\`\${guildId}_\${userId}\`, ticketChannel.id);

        const ticketEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎫 تذكرة جديدة')
            .setDescription(\`مرحباً \${interaction.user}! صف مشكلتك وسيساعدك الفريق قريباً.\`);

        const closeButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(\`close_ticket_\${userId}\`)
                    .setLabel('🗑️ إغلاق التذكرة')
                    .setStyle(ButtonStyle.Danger)
            );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [closeButton] });

        interaction.reply({ content: \`✅ تم إنشاء تذكرتك: \${ticketChannel}\`, ephemeral: true });
    }

    if (interaction.customId.startsWith('close_ticket_')) {
        const ticketChannel = interaction.channel;
        const userId = interaction.customId.split('_')[2];

        activeTickets.delete(\`\${interaction.guild.id}_\${userId}\`);

        await interaction.reply('🗑️ سيتم إغلاق التذكرة خلال 5 ثوانٍ...');

        setTimeout(() => {
            ticketChannel.delete();
        }, 5000);
    }
});

client.login('YOUR_BOT_TOKEN');`
        },
        author: "مطور محترف",
        verified: true,
        downloads: 189,
        rating: 4.9,
        ratingCount: 28,
        createdAt: new Date(),
      },
      {
        id: "moderation-bot",
        name: "بوت الإدارة الشامل",
        description: "أوامر إدارة متكاملة: طرد، حظر، تنظيف الرسائل",
        category: "moderation",
        tags: ["إدارة", "حظر", "طرد", "تنظيف"],
        files: {
          "index.js": `const { Client, GatewayIntentBits, Events, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once(Events.ClientReady, () => {
    console.log('🛡️ بوت الإدارة جاهز!');
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    const args = message.content.slice(1).split(' ');
    const command = args.shift().toLowerCase();

    // أمر الطرد
    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ ليس لديك صلاحية طرد الأعضاء!');
        }

        const member = message.mentions.members.first();
        if (!member) {
            return message.reply('❌ يجب منشن العضو المراد طرده!');
        }

        const reason = args.join(' ') || 'لا يوجد سبب';

        try {
            await member.kick(reason);
            message.reply(\`✅ تم طرد \${member.user.tag} - السبب: \${reason}\`);
        } catch (error) {
            message.reply('❌ فشل في طرد العضو!');
        }
    }

    // أمر الحظر
    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ ليس لديك صلاحية حظر الأعضاء!');
        }

        const member = message.mentions.members.first();
        if (!member) {
            return message.reply('❌ يجب منشن العضو المراد حظره!');
        }

        const reason = args.join(' ') || 'لا يوجد سبب';

        try {
            await member.ban({ reason });
            message.reply(\`✅ تم حظر \${member.user.tag} - السبب: \${reason}\`);
        } catch (error) {
            message.reply('❌ فشل في حظر العضو!');
        }
    }

    // أمر تنظيف الرسائل
    if (command === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ ليس لديك صلاحية إدارة الرسائل!');
        }

        const amount = parseInt(args[0]);
        if (!amount || amount < 1 || amount > 100) {
            return message.reply('❌ أدخل رقم بين 1 و 100!');
        }

        try {
            await message.channel.bulkDelete(amount + 1);
            const reply = await message.channel.send(\`✅ تم حذف \${amount} رسالة!\`);
            setTimeout(() => reply.delete(), 3000);
        } catch (error) {
            message.reply('❌ فشل في حذف الرسائل!');
        }
    }

    // أمر المساعدة
    if (command === 'help_mod') {
        const helpText = \`
🛡️ **أوامر الإدارة:**
\`!kick @عضو [سبب]\` - طرد عضو
\`!ban @عضو [سبب]\` - حظر عضو
\`!clear [عدد]\` - حذف رسائل (1-100)
\`!help_mod\` - هذه الرسالة
        \`;
        message.reply(helpText);
    }
});

client.login('YOUR_BOT_TOKEN');`
        },
        author: "خبير الأمان",
        verified: true,
        downloads: 312,
        rating: 4.7,
        ratingCount: 45,
        createdAt: new Date(),
      }
    ];

    sampleProjects.forEach(project => {
      this.projects.set(project.id, project);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getBots(): Promise<Bot[]> {
    return Array.from(this.bots.values());
  }

  async getBot(id: string): Promise<Bot | undefined> {
    return this.bots.get(id);
  }

  async createBot(insertBot: InsertBot): Promise<Bot> {
    const id = randomUUID();
    const now = new Date();
    const bot: Bot = { 
      ...insertBot, 
      id, 
      createdAt: now, 
      updatedAt: now,
      isActive: false,
      description: insertBot.description || null,
      files: insertBot.files || { "index.js": "// الملف الرئيسي للبوت" }
    };
    this.bots.set(id, bot);
    return bot;
  }

  async updateBot(id: string, updates: Partial<Bot>): Promise<Bot | undefined> {
    const bot = this.bots.get(id);
    if (!bot) return undefined;

    const updatedBot = { 
      ...bot, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.bots.set(id, updatedBot);
    return updatedBot;
  }

  async deleteBot(id: string): Promise<boolean> {
    return this.bots.delete(id);
  }

  async getAiChats(botId: string): Promise<AiChat[]> {
    return Array.from(this.aiChats.values()).filter(chat => chat.botId === botId);
  }

  async createAiChat(insertChat: InsertAiChat): Promise<AiChat> {
    const id = randomUUID();
    const chat: AiChat = { 
      ...insertChat, 
      id, 
      createdAt: new Date(),
      botId: insertChat.botId || null
    };
    this.aiChats.set(id, chat);
    return chat;
  }

  async deleteAiChat(id: string): Promise<boolean> {
    return this.aiChats.delete(id);
  }

  // Project management methods
  async getProjects(filters?: { query?: string; category?: string; verified?: boolean }): Promise<Project[]> {
    let projects = Array.from(this.projects.values());

    if (filters?.category && filters.category !== 'all') {
      projects = projects.filter(project => project.category === filters.category);
    }

    if (filters?.verified) {
      projects = projects.filter(project => project.verified);
    }

    if (filters?.query) {
      const searchTerm = filters.query.toLowerCase();
      projects = projects.filter(project => 
        project.name.toLowerCase().includes(searchTerm) ||
        project.description?.toLowerCase().includes(searchTerm) ||
        (project.tags && project.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }

    return projects;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = project.id || randomUUID();
    const newProject: Project = {
      ...project,
      id,
      createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
      updatedAt: new Date(),
      verified: project.verified || false,
      rating: project.rating || 0,
      ratingCount: project.ratingCount || 0,
      downloads: project.downloads || 0,
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  async incrementProjectDownloads(id: string): Promise<void> {
    const project = this.projects.get(id);
    if (project) {
      project.downloads = (project.downloads || 0) + 1;
      this.projects.set(id, project);
    }
  }

  private initializeSampleData() {
    // Initialize with some sample scraped data
    const sampleData: ScrapedData[] = [
      {
        id: "sample-1",
        source: "example.com",
        type: "web",
        title: "Sample Web Page",
        url: "https://example.com",
        content: { title: "Sample", text: "Sample content" },
        dataPoints: 25,
        status: "complete",
        metadata: { scrapingType: "Full Page Content" },
        timestamp: new Date(),
      },
    ];

    sampleData.forEach(item => {
      this.scrapedData.set(item.id, item);
    });
  }

  // Scraped data methods
  async getScrapedData(): Promise<ScrapedData[]> {
    return Array.from(this.scrapedData.values());
  }

  async getScrapedDataItem(id: string): Promise<ScrapedData | undefined> {
    return this.scrapedData.get(id);
  }

  async createScrapedData(insertData: InsertScrapedData): Promise<ScrapedData> {
    const id = randomUUID();
    const data: ScrapedData = {
      ...insertData,
      id,
      timestamp: new Date(),
    };
    this.scrapedData.set(id, data);
    return data;
  }

  async updateScrapedData(id: string, updates: Partial<ScrapedData>): Promise<ScrapedData | undefined> {
    const data = this.scrapedData.get(id);
    if (!data) return undefined;

    const updatedData = { ...data, ...updates };
    this.scrapedData.set(id, updatedData);
    return updatedData;
  }

  async deleteScrapedData(id: string): Promise<boolean> {
    return this.scrapedData.delete(id);
  }

  // Chat message methods
  async getChatMessages(): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).sort(
      (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async clearChatMessages(): Promise<boolean> {
    this.chatMessages.clear();
    return true;
  }
}

export const storage = new MemStorage();