import { Textarea } from "@/components/ui/textarea";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: number;
}

export default function CodeEditor({ 
  value, 
  onChange, 
  language = "javascript", 
  height = 500 
}: CodeEditorProps) {
  return (
    <div className="h-full flex flex-col" data-testid="code-editor">
      <div className="bg-muted px-3 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">محرر الكود - JavaScript</span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-h-0 resize-none border-0 rounded-none font-mono text-sm"
        style={{ height: `${height - 40}px` }}
        placeholder="// اكتب كود البوت هنا...
const { Client, GatewayIntentBits, Events } = require('discord.js');

client.once(Events.ClientReady, (readyClient) => {
    console.log(`البوت جاهز! تم تسجيل الدخول كـ ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!ping') {
        message.reply('Pong! 🏓');
    }
});"
      />
    </div>
  );
}
