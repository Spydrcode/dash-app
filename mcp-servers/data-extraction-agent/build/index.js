#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import { v4 as uuidv4 } from "uuid";
import winston from "winston";
// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
    ],
});
class DataExtractionMCPServer {
    server;
    ollamaUrl;
    ollamaModel;
    constructor() {
        this.server = new Server({
            name: "driver-profit-data-extraction",
            version: "1.0.0",
        }, {
            capabilities: {
                resources: {},
                tools: {},
            },
        });
        this.ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
        this.ollamaModel = process.env.OLLAMA_MODEL || "llama2:13b-instruct";
        this.setupHandlers();
    }
    setupHandlers() {
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
            resources: [
                {
                    uri: "extraction://processed-trips",
                    name: "Processed Trip Data",
                    description: "List of all processed trip data from screenshots",
                    mimeType: "application/json",
                },
                {
                    uri: "extraction://ocr-results",
                    name: "OCR Results",
                    description: "Raw OCR text extraction results",
                    mimeType: "text/plain",
                },
            ],
        }));
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const uri = request.params.uri;
            if (uri === "extraction://processed-trips") {
                // Return processed trip data (would typically come from database)
                return {
                    contents: [
                        {
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify({
                                message: "Trip data would be retrieved from database",
                            }),
                        },
                    ],
                };
            }
            else if (uri === "extraction://ocr-results") {
                return {
                    contents: [
                        {
                            uri,
                            mimeType: "text/plain",
                            text: "OCR results would be stored here",
                        },
                    ],
                };
            }
            throw new Error(`Resource not found: ${uri}`);
        });
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "extract_trip_data",
                    description: "Extract trip data from screenshot using OCR and LLM processing",
                    inputSchema: {
                        type: "object",
                        properties: {
                            image_path: {
                                type: "string",
                                description: "Path to the screenshot image file",
                            },
                            image_base64: {
                                type: "string",
                                description: "Base64 encoded image data",
                            },
                        },
                        required: ["image_path"],
                    },
                },
                {
                    name: "process_text_extraction",
                    description: "Process raw text through LLM to extract structured trip data",
                    inputSchema: {
                        type: "object",
                        properties: {
                            raw_text: {
                                type: "string",
                                description: "Raw text from OCR or manual input",
                            },
                            platform: {
                                type: "string",
                                description: "Platform type (uber, lyft, doordash, etc.)",
                                enum: [
                                    "uber",
                                    "lyft",
                                    "doordash",
                                    "grubhub",
                                    "instacart",
                                    "other",
                                ],
                            },
                        },
                        required: ["raw_text"],
                    },
                },
                {
                    name: "validate_trip_data",
                    description: "Validate and clean extracted trip data",
                    inputSchema: {
                        type: "object",
                        properties: {
                            trip_data: {
                                type: "object",
                                description: "Raw extracted trip data to validate",
                            },
                        },
                        required: ["trip_data"],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            switch (name) {
                case "extract_trip_data":
                    return await this.extractTripData(args);
                case "process_text_extraction":
                    return await this.processTextExtraction(args);
                case "validate_trip_data":
                    return await this.validateTripData(args);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }
    async extractTripData(args) {
        try {
            logger.info(`Extracting trip data from image: ${args.image_path}`);
            // Step 1: OCR Processing
            const ocrResult = await this.performOCR(args.image_path, args.image_base64);
            // Step 2: LLM Processing
            const tripData = await this.processTextExtraction({
                raw_text: ocrResult.text,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            trip_data: tripData.content[0].text,
                            ocr_confidence: ocrResult.confidence,
                            processing_time: new Date().toISOString(),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logger.error("Error extracting trip data:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error
                                ? error.message
                                : "Unknown error occurred",
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async performOCR(imagePath, imageBase64) {
        try {
            let imageBuffer;
            if (imageBase64) {
                imageBuffer = Buffer.from(imageBase64, "base64");
            }
            else {
                // In a real implementation, you'd read from the file system
                throw new Error("Image file reading not implemented in this example");
            }
            // Preprocess image for better OCR results
            const processedImage = await sharp(imageBuffer)
                .grayscale()
                .normalize()
                .sharpen()
                .toBuffer();
            // Perform OCR
            const { data: { text, confidence }, } = await Tesseract.recognize(processedImage, "eng", {
                logger: (m) => logger.debug(`OCR Progress: ${m.progress}`),
            });
            return { text, confidence };
        }
        catch (error) {
            logger.error("OCR processing failed:", error);
            throw error;
        }
    }
    async processTextExtraction(args) {
        try {
            const prompt = this.buildExtractionPrompt(args.raw_text, args.platform);
            const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                model: this.ollamaModel,
                prompt,
                stream: false,
                options: {
                    temperature: 0.1, // Low temperature for consistent extraction
                    top_p: 0.9,
                },
            });
            const result = response.data;
            // Parse the LLM response into structured data
            const tripData = this.parseExtractionResponse(result.response);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tripData, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logger.error("Text processing failed:", error);
            throw error;
        }
    }
    buildExtractionPrompt(rawText, platform) {
        return `
Extract trip/delivery information from the following text. Return ONLY valid JSON with these exact fields:

{
  "pickup_location": "string or null",
  "dropoff_location": "string or null", 
  "fare_amount": "number or null",
  "distance": "number in miles or null",
  "duration": "string (e.g., '15 min') or null",
  "trip_date": "string (YYYY-MM-DD) or null",
  "trip_time": "string (HH:MM format) or null",
  "platform": "string (uber, lyft, doordash, etc.) or null",
  "driver_earnings": "number or null",
  "expenses": "number or null"
}

Rules:
- Extract only information that is clearly visible
- Use null for missing information
- Convert all amounts to numbers (remove $ signs)
- Convert distances to miles if in km
- Be conservative - if unsure, use null
${platform ? `- This appears to be from ${platform}` : ""}

Text to analyze:
${rawText}

JSON:`;
    }
    parseExtractionResponse(response) {
        try {
            // Clean the response to extract JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in response");
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                id: uuidv4(),
                ...parsed,
                raw_text: response,
            };
        }
        catch (error) {
            logger.error("Failed to parse extraction response:", error);
            return {
                id: uuidv4(),
                raw_text: response,
            };
        }
    }
    async validateTripData(args) {
        try {
            const validatedData = this.cleanAndValidateTripData(args.trip_data);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            validated_data: validatedData,
                            validation_notes: this.getValidationNotes(validatedData),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : "Validation failed",
                        }, null, 2),
                    },
                ],
            };
        }
    }
    cleanAndValidateTripData(data) {
        // Implement validation logic
        const cleaned = {
            id: data.id || uuidv4(),
        };
        // Validate and clean each field
        if (data.pickup_location && typeof data.pickup_location === "string") {
            cleaned.pickup_location = data.pickup_location.trim();
        }
        if (data.dropoff_location && typeof data.dropoff_location === "string") {
            cleaned.dropoff_location = data.dropoff_location.trim();
        }
        if (data.fare_amount &&
            typeof data.fare_amount === "number" &&
            data.fare_amount > 0) {
            cleaned.fare_amount = Math.round(data.fare_amount * 100) / 100; // Round to 2 decimals
        }
        // Add more validation logic as needed
        return cleaned;
    }
    getValidationNotes(data) {
        const notes = [];
        if (!data.pickup_location)
            notes.push("Missing pickup location");
        if (!data.dropoff_location)
            notes.push("Missing dropoff location");
        if (!data.fare_amount)
            notes.push("Missing fare amount");
        if (!data.trip_date)
            notes.push("Missing trip date");
        return notes;
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        logger.info("Data Extraction MCP Server running on stdio");
    }
}
const server = new DataExtractionMCPServer();
server.run().catch((error) => {
    logger.error("Server failed to start:", error);
    process.exit(1);
});
