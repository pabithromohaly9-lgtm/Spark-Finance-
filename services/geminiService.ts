
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, FinancialSummary, Insight, ChatMessage } from "../types";

const MODEL_NAME = "gemini-3-pro-preview";

export const getFinancialInsights = async (
  transactions: Transaction[],
  summary: FinancialSummary
): Promise<Insight[]> => {
  if (!navigator.onLine) {
    return [{
      title: "অফলাইন মোড",
      description: "এআই পরামর্শ পেতে ইন্টারনেটের প্রয়োজন। আপনার বর্তমান ডেটা অফলাইনে সংরক্ষিত আছে।",
      type: "info"
    }];
  }
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    তুমি একজন দক্ষ আর্থিক উপদেষ্টা। নিচের ডেটা বিশ্লেষণ করে ৩টি পরামর্শ দাও:
    ব্যালেন্স: ৳${summary.balance}, আয়: ৳${summary.totalIncome}, ব্যয়: ৳${summary.totalExpenses}
    ক্যাটাগরি খরচ: ${JSON.stringify(summary.categoryBreakdown)}
    JSON ফরম্যাটে উত্তর দাও (title, description, type: 'success'|'info'). বাংলা ভাষায়।
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const chatWithAI = async (
  message: string,
  history: ChatMessage[],
  summary: FinancialSummary,
  transactions: Transaction[]
): Promise<string> => {
  if (!navigator.onLine) return "আপনি বর্তমানে অফলাইনে আছেন। এআই চ্যাট ব্যবহার করতে ইন্টারনেটের প্রয়োজন।";
  if (!process.env.API_KEY) return "এপিআই কী পাওয়া যায়নি।";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const context = `
    ইউজারের আর্থিক অবস্থা:
    - বর্তমান ব্যালেন্স: ৳${summary.balance}
    - এই মাসের মোট আয়: ৳${summary.totalIncome}
    - এই মাসের মোট ব্যয়: ৳${summary.totalExpenses}
    - খরচের খাতসমূহ: ${JSON.stringify(summary.categoryBreakdown)}
    
    নির্দেশনা:
    ১. তুমি স্পার্ক ফিন্যান্সের অফিশিয়াল এআই অ্যাসিস্ট্যান্ট। 
    ২. সবসময় বাংলা ভাষায় উত্তর দাও। 
    ৩. বন্ধুত্বপূর্ণ এবং সহযোগিতামূলক হও। 
    ৪. ইউজারের ডেটার ওপর ভিত্তি করে উত্তর দাও।
  `;

  try {
    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: context,
      },
      history: history.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }))
    });

    const response = await chat.sendMessage({ message });
    return response.text || "আমি দুঃখিত, উত্তর তৈরি করতে পারছি না।";
  } catch (error) {
    console.error(error);
    return "সার্ভারে সমস্যা হচ্ছে, দয়া করে পরে চেষ্টা করুন।";
  }
};
