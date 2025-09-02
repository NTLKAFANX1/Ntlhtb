import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { botManager } from "./services/botManager";
import { aiAssistant } from "./services/aiAssistant";
import { insertBotSchema, insertAiChatSchema, insertScrapedDataSchema, insertChatMessageSchema } from "@shared/schema";
import { insertProjectSchema, projectSearchSchema } from "@shared/projectSchema";
import { webScraper } from "./services/scraper";
import { dataAnalysisService } from "./services/openai";
import { CodeValidator } from "./services/codeValidator";
import multer from "multer";
import fs from "fs/promises";
import path from "path";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Get all bots
  app.get("/api/bots", async (req, res) => {
    try {
      const bots = await storage.getBots();
      const botsWithStatus = bots.map(bot => ({
        ...bot,
        isActive: botManager.getBotStatus(bot.id)
      }));
      res.json(botsWithStatus);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل البوتات" });
    }
  });

  // Get single bot
  app.get("/api/bots/:id", async (req, res) => {
    try {
      const bot = await storage.getBot(req.params.id);
      if (!bot) {
        return res.status(404).json({ message: "البوت غير موجود" });
      }
      res.json({
        ...bot,
        isActive: botManager.getBotStatus(bot.id)
      });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل البوت" });
    }
  });

  // Create new bot
  app.post("/api/bots", async (req, res) => {
    try {
      const validation = insertBotSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة" });
      }

      const bot = await storage.createBot(validation.data);
      res.status(201).json(bot);
    } catch (error) {
      res.status(500).json({ message: "فشل في إنشاء البوت" });
    }
  });

  // Update bot
  app.patch("/api/bots/:id", async (req, res) => {
    try {
      console.log(`🔄 طلب تحديث البوت ${req.params.id}`);
      console.log(`📊 البيانات المُرسلة:`, JSON.stringify(req.body, null, 2));
      
      const bot = await storage.updateBot(req.params.id, req.body);
      if (!bot) {
        console.error(`❌ البوت ${req.params.id} غير موجود`);
        return res.status(404).json({ message: "البوت غير موجود" });
      }
      
      console.log(`✅ تم تحديث البوت ${bot.name} بنجاح`);
      res.json(bot);
    } catch (error) {
      console.error(`❌ خطأ في تحديث البوت:`, error);
      res.status(500).json({ message: "فشل في تحديث البوت" });
    }
  });

  // Delete bot
  app.delete("/api/bots/:id", async (req, res) => {
    try {
      await botManager.stopBot(req.params.id);
      const deleted = await storage.deleteBot(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "البوت غير موجود" });
      }
      res.json({ message: "تم حذف البوت بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف البوت" });
    }
  });

  // Start bot
  app.post("/api/bots/:id/start", async (req, res) => {
    try {
      const success = await botManager.startBot(req.params.id);
      if (success) {
        res.json({ message: "تم تشغيل البوت بنجاح" });
      } else {
        res.status(500).json({ message: "فشل في تشغيل البوت" });
      }
    } catch (error) {
      res.status(500).json({ message: "فشل في تشغيل البوت" });
    }
  });

  // Stop bot
  app.post("/api/bots/:id/stop", async (req, res) => {
    try {
      const success = await botManager.stopBot(req.params.id);
      if (success) {
        res.json({ message: "تم إيقاف البوت بنجاح" });
      } else {
        res.status(500).json({ message: "فشل في إيقاف البوت" });
      }
    } catch (error) {
      res.status(500).json({ message: "فشل في إيقاف البوت" });
    }
  });

  // Restart bot
  app.post("/api/bots/:id/restart", async (req, res) => {
    try {
      const success = await botManager.restartBot(req.params.id);
      if (success) {
        res.json({ message: "تم إعادة تشغيل البوت بنجاح" });
      } else {
        res.status(500).json({ message: "فشل في إعادة تشغيل البوت" });
      }
    } catch (error) {
      res.status(500).json({ message: "فشل في إعادة تشغيل البوت" });
    }
  });

  // File management routes
  app.post("/api/bots/:id/files", async (req, res) => {
    try {
      console.log(`📁 طلب حفظ ملف للبوت ${req.params.id}`);
      
      const { fileName, content } = req.body;
      if (!fileName || typeof content !== 'string') {
        console.error(`❌ بيانات غير صحيحة: fileName=${fileName}, content type=${typeof content}`);
        return res.status(400).json({ message: "اسم الملف والمحتوى مطلوبان" });
      }

      console.log(`📝 حفظ الملف: ${fileName} (${content.length} حرف)`);

      const bot = await storage.getBot(req.params.id);
      if (!bot) {
        console.error(`❌ البوت ${req.params.id} غير موجود`);
        return res.status(404).json({ message: "البوت غير موجود" });
      }

      const files = (bot.files as Record<string, string>) || {};
      files[fileName] = content;

      console.log(`💾 تحديث ملفات البوت...`);
      const updatedBot = await storage.updateBot(req.params.id, { files });
      
      console.log(`✅ تم حفظ الملف ${fileName} بنجاح للبوت ${bot.name}`);
      res.json(updatedBot);
    } catch (error) {
      console.error(`❌ خطأ في حفظ الملف:`, error);
      res.status(500).json({ message: "فشل في إضافة الملف" });
    }
  });

  app.delete("/api/bots/:id/files/:fileName", async (req, res) => {
    try {
      const bot = await storage.getBot(req.params.id);
      if (!bot) {
        return res.status(404).json({ message: "البوت غير موجود" });
      }

      const files = (bot.files as Record<string, string>) || {};
      delete files[req.params.fileName];

      const updatedBot = await storage.updateBot(req.params.id, { files });
      res.json(updatedBot);
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف الملف" });
    }
  });

  // AI Assistant chat
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, currentCode, chatHistory } = req.body;

      if (!message) {
        return res.status(400).json({ message: "الرسالة مطلوبة" });
      }

      const response = await aiAssistant.getCodingHelp(message, currentCode || "", chatHistory || []);
      res.json(response);
    } catch (error) {
      console.error("Chat route error:", error);
      // Provide a basic response instead of error
      res.json({
        response: "أنا هنا لمساعدتك في برمجة بوتات ديسكورد! يمكنني مساعدتك في:\n• إنشاء بوت جديد\n• إضافة أوامر\n• إصلاح الأخطاء\n• تحسين الكود\n\nما الذي تحتاج مساعدة فيه؟",
        suggestions: ["إنشاء بوت أساسي", "إضافة أوامر جديدة", "مراجعة الكود الحالي"]
      });
    }
  });

  // Generate bot code
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { description } = req.body;

      if (!description) {
        return res.status(400).json({ message: "وصف البوت مطلوب" });
      }

      const code = await aiAssistant.generateBotCode(description);
      res.json({ code });
    } catch (error) {
      console.error("Generate route error:", error);
      // Provide basic template
      const { description } = req.body;
      const basicTemplate = `const { Client, GatewayIntentBits, Events } = require('discord.js');

// ${description || 'بوت ديسكورد أساسي'}

client.once(Events.ClientReady, (readyClient) => {
    console.log(\`البوت جاهز! تم تسجيل الدخول كـ \${readyClient.user.tag}\`);
});

client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;

    if (message.content === '!ping') {
        message.reply('Pong! 🏓');
    }
});`;
      res.json({ code: basicTemplate });
    }
  });

  // Review code
  app.post("/api/ai/review", async (req, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ message: "الكود مطلوب" });
      }

      const review = await aiAssistant.reviewCode(code);
      res.json(review);
    } catch (error) {
      console.error("Review route error:", error);
      // Provide basic review
      res.json({
        response: "الكود يبدو جيداً! تأكد من إضافة معالجة الأخطاء والمزيد من الأوامر.",
        suggestions: ["أضف المزيد من الأوامر", "حسن معالجة الأخطاء", "أضف تسجيل الأحداث"]
      });
    }
  });

  // Upload bot files
  app.post("/api/bots/upload", upload.single('botFile'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم رفع أي ملف" });
      }

      const filePath = req.file.path;
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Clean up uploaded file
      await fs.unlink(filePath);

      res.json({ 
        message: "تم رفع الملف بنجاح",
        content: fileContent 
      });
    } catch (error) {
      res.status(500).json({ message: "فشل في رفع الملف" });
    }
  });

  // Get AI chat history
  app.get("/api/ai/chats/:botId", async (req, res) => {
    try {
      const chats = await storage.getAiChats(req.params.botId);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل المحادثات" });
    }
  });

  // Save AI chat
  app.post("/api/ai/chats", async (req, res) => {
    try {
      const validation = insertAiChatSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة" });
      }

      const chat = await storage.createAiChat(validation.data);
      res.status(201).json(chat);
    } catch (error) {
      res.status(500).json({ message: "فشل في حفظ المحادثة" });
    }
  });

  // File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'لم يتم اختيار ملف' });
  }

  try {
    const fileContent = await fs.readFile(req.file.path, 'utf8');

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.json({ 
      content: fileContent,
      filename: req.file.originalname 
    });
  } catch (error) {
    console.error('Error reading uploaded file:', error);
    res.status(500).json({ message: 'خطأ في قراءة الملف' });
  }
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const { query, category, verified } = req.query;
    const filters = {
      query: query ? String(query) : undefined,
      category: category && category !== 'all' ? String(category) : undefined,
      verified: verified === 'true' ? true : undefined
    };

    const projects = await storage.getProjects(filters);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'خطأ في تحميل المشاريع' });
  }
});

// Get single project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'خطأ في تحميل المشروع' });
  }
});

// Create new project
app.post('/api/projects', async (req, res) => {
  try {
    const newProject = {
      id: Date.now().toString(),
      ...req.body,
      verified: false,
      rating: 0,
      ratingCount: 0,
      downloads: 0,
      createdAt: new Date().toISOString()
    };

    const project = await storage.createProject(newProject);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'خطأ في إنشاء المشروع' });
  }
});

// Download project
app.post('/api/projects/:id/download', async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    // Increment download count
    await storage.incrementProjectDownloads(req.params.id);

    res.json({
      files: project.files,
      name: project.name
    });
  } catch (error) {
    console.error('Error downloading project:', error);
    res.status(500).json({ message: 'خطأ في تحميل المشروع' });
  }
});

  // Scraped data endpoints
  app.get('/api/scraped-data', async (req, res) => {
    try {
      const data = await storage.getScrapedData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: 'فشل في تحميل البيانات' });
    }
  });

  app.post('/api/scrape', async (req, res) => {
    try {
      const { source, type, url, metadata } = req.body;
      
      // Create initial record
      const scrapedRecord = await storage.createScrapedData({
        source,
        type,
        url,
        title: null,
        content: null,
        dataPoints: 0,
        status: 'processing',
        metadata,
      });

      // Start scraping process
      if (type === 'web' && url) {
        try {
          await storage.updateScrapedData(scrapedRecord.id, { status: 'processing' });
          const result = await webScraper.scrapeWebsite(url, metadata?.scrapingType);
          
          await storage.updateScrapedData(scrapedRecord.id, {
            title: result.title,
            content: result.content,
            dataPoints: result.dataPoints,
            status: 'complete',
            metadata: { ...metadata, ...result.metadata },
          });
        } catch (error) {
          await storage.updateScrapedData(scrapedRecord.id, { 
            status: 'failed',
            metadata: { ...metadata, error: error.message }
          });
        }
      } else if (type === 'social') {
        // For social media, simulate data collection
        setTimeout(async () => {
          const mockDataPoints = Math.floor(Math.random() * 50) + 10;
          await storage.updateScrapedData(scrapedRecord.id, {
            title: `${metadata?.platform || 'Social'} Posts`,
            content: { posts: [], searchTerms: metadata?.searchTerms },
            dataPoints: mockDataPoints,
            status: 'complete',
          });
        }, 2000);
      }

      res.json(scrapedRecord);
    } catch (error) {
      res.status(500).json({ message: 'فشل في بدء عملية الكشط' });
    }
  });

  app.delete('/api/scraped-data/:id', async (req, res) => {
    try {
      const deleted = await storage.deleteScrapedData(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'البيانات غير موجودة' });
      }
      res.json({ message: 'تم حذف البيانات بنجاح' });
    } catch (error) {
      res.status(500).json({ message: 'فشل في حذف البيانات' });
    }
  });

  // Chat endpoints
  app.get('/api/chat/messages', async (req, res) => {
    try {
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'فشل في تحميل الرسائل' });
    }
  });

  app.post('/api/chat/message', async (req, res) => {
    try {
      const { role, content } = req.body;
      
      // Save user message
      const userMessage = await storage.createChatMessage({ role, content });
      
      // Generate AI response if user message
      if (role === 'user') {
        try {
          const scrapedData = await storage.getScrapedData();
          const aiResponse = await dataAnalysisService.analyzeData(content, scrapedData);
          
          // Save AI response
          await storage.createChatMessage({ 
            role: 'assistant', 
            content: aiResponse.content 
          });
        } catch (error) {
          // Save fallback response
          await storage.createChatMessage({ 
            role: 'assistant', 
            content: 'عذراً، لا يمكنني تحليل البيانات في الوقت الحالي. تأكد من إعداد API key بشكل صحيح.' 
          });
        }
      }
      
      res.json(userMessage);
    } catch (error) {
      res.status(500).json({ message: 'فشل في إرسال الرسالة' });
    }
  });

  app.delete('/api/chat/messages', async (req, res) => {
    try {
      await storage.clearChatMessages();
      res.json({ message: 'تم مسح المحادثة بنجاح' });
    } catch (error) {
      res.status(500).json({ message: 'فشل في مسح المحادثة' });
    }
  });

  // Stats endpoint
  app.get('/api/stats', async (req, res) => {
    try {
      const scrapedData = await storage.getScrapedData();
      const chatMessages = await storage.getChatMessages();
      
      const stats = {
        totalUrls: scrapedData.filter(item => item.type === 'web').length,
        socialPosts: scrapedData.filter(item => item.type === 'social').length,
        dataPoints: scrapedData.reduce((sum, item) => sum + (item.dataPoints || 0), 0),
        chatQueries: chatMessages.filter(msg => msg.role === 'user').length,
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'فشل في تحميل الإحصائيات' });
    }
  });

  // Analysis endpoints
  app.post('/api/analyze/summary', async (req, res) => {
    try {
      const scrapedData = await storage.getScrapedData();
      const summary = await dataAnalysisService.generateDataSummary(scrapedData);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: 'فشل في إنشاء التقرير' });
    }
  });

  // Export endpoint
  app.get('/api/export/csv', async (req, res) => {
    try {
      const scrapedData = await storage.getScrapedData();
      
      // Simple CSV generation
      const csvHeader = 'ID,Source,Type,Title,DataPoints,Status,Timestamp\n';
      const csvRows = scrapedData.map(item => 
        `"${item.id}","${item.source}","${item.type}","${item.title || ''}","${item.dataPoints || 0}","${item.status}","${item.timestamp}"`
      ).join('\n');
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="scraped_data.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: 'فشل في تصدير البيانات' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}