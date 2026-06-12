import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FALLBACK_FILE_PATH = path.join(__dirname, 'db_fallback.json');

// Mongoose Models Setup
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tokenNumber: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['waiting', 'serving', 'completed', 'skipped'], 
    default: 'waiting' 
  },
  createdAt: { type: Date, default: Date.now },
  calledAt: { type: Date },
  completedAt: { type: Date }
});

const configSchema = new mongoose.Schema({
  averageConsultationTime: { type: Number, default: 10 },
  lastTokenNumber: { type: Number, default: 0 }
});

const Patient = mongoose.model('Patient', patientSchema);
const QueueConfig = mongoose.model('QueueConfig', configSchema);

let isUsingMongo = false;

// Initialize MongoDB connection
export async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queue-cure';
  try {
    console.log(`Attempting to connect to MongoDB at: ${mongoURI}...`);
    // Set a small timeout for testing local connections quickly
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000
    });
    isUsingMongo = true;
    console.log('Successfully connected to MongoDB.');
    
    // Initialize config if not present
    const config = await QueueConfig.findOne();
    if (!config) {
      await QueueConfig.create({ averageConsultationTime: 10, lastTokenNumber: 0 });
    }
  } catch (err) {
    console.warn('----------------------------------------------------');
    console.warn(`WARNING: MongoDB connection failed: ${err.message}`);
    console.warn(`Queue Cure is falling back to local JSON file storage:`);
    console.warn(FALLBACK_FILE_PATH);
    console.warn('----------------------------------------------------');
    isUsingMongo = false;
    await initFallbackFile();
  }
}

// Fallback Helper Functions
async function initFallbackFile() {
  try {
    await fs.access(FALLBACK_FILE_PATH);
  } catch {
    // File doesn't exist, create it with initial structure
    const initialData = {
      config: { averageConsultationTime: 10, lastTokenNumber: 0 },
      patients: []
    };
    await fs.writeFile(FALLBACK_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

async function readFallbackData() {
  await initFallbackFile();
  const dataStr = await fs.readFile(FALLBACK_FILE_PATH, 'utf-8');
  return JSON.parse(dataStr);
}

async function writeFallbackData(data) {
  await fs.writeFile(FALLBACK_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Global Database API

export async function getQueueConfig() {
  if (isUsingMongo) {
    let config = await QueueConfig.findOne();
    if (!config) {
      config = await QueueConfig.create({ averageConsultationTime: 10, lastTokenNumber: 0 });
    }
    return config;
  } else {
    const data = await readFallbackData();
    return data.config;
  }
}

export async function updateAverageConsultationTime(minutes) {
  const parsedMinutes = parseInt(minutes) || 10;
  if (isUsingMongo) {
    await QueueConfig.updateOne({}, { $set: { averageConsultationTime: parsedMinutes } });
    return await getQueueConfig();
  } else {
    const data = await readFallbackData();
    data.config.averageConsultationTime = parsedMinutes;
    await writeFallbackData(data);
    return data.config;
  }
}

export async function getPatients() {
  if (isUsingMongo) {
    return await Patient.find().sort({ createdAt: 1 });
  } else {
    const data = await readFallbackData();
    return data.patients;
  }
}

export async function addPatient(name) {
  if (isUsingMongo) {
    // Auto-increment token number atomic operation
    const config = await QueueConfig.findOneAndUpdate(
      {},
      { $inc: { lastTokenNumber: 1 } },
      { new: true, upsert: true }
    );
    
    const newPatient = new Patient({
      name,
      tokenNumber: config.lastTokenNumber,
      status: 'waiting',
      createdAt: new Date()
    });
    
    await newPatient.save();
    return newPatient;
  } else {
    const data = await readFallbackData();
    data.config.lastTokenNumber += 1;
    
    const newPatient = {
      _id: 'p_' + Math.random().toString(36).substr(2, 9),
      name,
      tokenNumber: data.config.lastTokenNumber,
      status: 'waiting',
      createdAt: new Date().toISOString()
    };
    
    data.patients.push(newPatient);
    await writeFallbackData(data);
    return newPatient;
  }
}

export async function callNextPatient() {
  if (isUsingMongo) {
    // 1. Mark currently serving patient as completed
    await Patient.updateMany(
      { status: 'serving' },
      { $set: { status: 'completed', completedAt: new Date() } }
    );
    
    // 2. Find the next waiting patient
    const nextPatient = await Patient.findOne({ status: 'waiting' })
      .sort({ tokenNumber: 1 });
      
    if (nextPatient) {
      nextPatient.status = 'serving';
      nextPatient.calledAt = new Date();
      await nextPatient.save();
    }
    
    return {
      patients: await getPatients()
    };
  } else {
    const data = await readFallbackData();
    const nowStr = new Date().toISOString();
    
    // 1. Mark currently serving as completed
    data.patients.forEach(p => {
      if (p.status === 'serving') {
        p.status = 'completed';
        p.completedAt = nowStr;
      }
    });
    
    // 2. Find next waiting
    const nextPatient = data.patients
      .filter(p => p.status === 'waiting')
      .sort((a, b) => a.tokenNumber - b.tokenNumber)[0];
      
    if (nextPatient) {
      nextPatient.status = 'serving';
      nextPatient.calledAt = nowStr;
    }
    
    await writeFallbackData(data);
    return {
      patients: data.patients
    };
  }
}

export async function skipPatient(patientId) {
  if (isUsingMongo) {
    const patient = await Patient.findById(patientId);
    if (patient && patient.status === 'waiting') {
      patient.status = 'skipped';
      patient.completedAt = new Date(); // timestamp for skipped action
      await patient.save();
    }
    return await getPatients();
  } else {
    const data = await readFallbackData();
    const patient = data.patients.find(p => p._id === patientId);
    if (patient && patient.status === 'waiting') {
      patient.status = 'skipped';
      patient.completedAt = new Date().toISOString();
    }
    await writeFallbackData(data);
    return data.patients;
  }
}

export async function resetQueue() {
  if (isUsingMongo) {
    await Patient.deleteMany({});
    await QueueConfig.updateOne({}, { $set: { lastTokenNumber: 0 } });
    return {
      config: await getQueueConfig(),
      patients: []
    };
  } else {
    const data = await readFallbackData();
    data.config.lastTokenNumber = 0;
    data.patients = [];
    await writeFallbackData(data);
    return {
      config: data.config,
      patients: []
    };
  }
}
