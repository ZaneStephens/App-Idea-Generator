/**
 * API handler for communicating with Google Gemini
 */

class GeminiAPI {
    constructor() {
      // In a real application, you would get this from environment variables
      // For this front-end only app, we'll set it when the user provides it
      this.apiKey = localStorage.getItem('geminiApiKey') || '';
      this.baseApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
      this.defaultModel = 'gemini-2.5-pro-exp-03-25';
      this.featureSuggestionModel = 'gemini-2.0-flash-thinking-exp-01-21'; // Use flash model for feature suggestions
  
      // ADDED: Language file type mapping (mirrored from app.js for internal use if needed, though primary logic is in app.js)
      // This isn't strictly necessary here if app.js passes all required info, but can be useful for consistency.
      this.languageFileTypes = {
        'javascript': { code: 'js', style: 'css' },
        'typescript': { code: 'ts', style: 'css' },
        'python': { code: 'py', style: 'css' },
        'java': { code: 'java', style: 'css' },
        'csharp': { code: 'cs', style: 'css' },
        'go': { code: 'go', style: 'css' },
        'rust': { code: 'rs', style: 'css' },
        'swift': { code: 'swift', style: 'css' },
        'kotlin': { code: 'kt', style: 'css' },
        'php': { code: 'php', style: 'css' }
      };
       // ADDED: Helper for display names (mirrored from app.js)
      this.languageDisplayNames = {
         'javascript': 'JavaScript', 'typescript': 'TypeScript', 'python': 'Python',
         'java': 'Java', 'csharp': 'C#', 'go': 'Go', 'rust': 'Rust', 'swift': 'Swift',
         'kotlin': 'Kotlin', 'php': 'PHP'
       };
    }
  
    getLanguageDisplayName(languageCode) {
      return this.languageDisplayNames[languageCode] || languageCode;
    }
  
    setApiKey(key) {
      this.apiKey = key;
      localStorage.setItem('geminiApiKey', key);
    }
  
    async generateBuildGuide(ideaData) {
      if (!this.apiKey) {
        throw new Error('API key not set. Please add your Gemini API key.');
      }
  
      const prompt = this.createPrompt(ideaData);
      const modelName = ideaData.aiModel || this.defaultModel;
  
      try {
        const response = await fetch(`${this.baseApiUrl}${modelName}:generateContent?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: modelName.includes('flash') ? 0.8 : 0.8, // Lower temperature for flash model
              topK: 40,
              topP: 0.95,
              maxOutputTokens: modelName.includes('flash') ? 8192 : 30192, // Smaller for flash model
            }
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
  
        const data = await response.json();
  
        // For Build Guide type, just return the standard response
        return this.processResponse(data, ideaData.appName);
  
      } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
      }
    }
  
    // CHANGED: Updated to handle generic fileType ('code', 'style') passed from app.js
    async generateAdditionalFile(projectData, fileType /* 'code' or 'style' */) {
      if (!this.apiKey) {
        throw new Error('API key not set. Please add your Gemini API key.');
      }
  
      // Use the project data, including specific language info passed in projectData.data
      const ideaData = {
        ...projectData.data,
        fileType: fileType // Now expecting 'code' or 'style'
      };
  
      // Always include the build guide for context and consistency
      ideaData.buildGuideContent = projectData.content; // Assumes projectData is the main project structure
  
      // Prepare context for other files based on generic types
      let codeGuideContext = null;
      let styleGuideContext = null;
  
      // If associatedFiles exists, find existing 'code' and 'style' guides
      if (projectData.associatedFiles && Array.isArray(projectData.associatedFiles)) {
          const codeFile = projectData.associatedFiles.find(file => file.fileType === 'code');
          const styleFile = projectData.associatedFiles.find(file => file.fileType === 'style');
  
          if (codeFile) {
              codeGuideContext = codeFile.content;
          }
          if (styleFile) {
              styleGuideContext = styleFile.content;
          }
      }
  
      // Add relevant context to ideaData for the prompt creation
      if (fileType === 'code') {
          // Generating code guide, add style guide context if available
          if (styleGuideContext) ideaData.styleGuideContent = styleGuideContext;
      } else if (fileType === 'style') {
          // Generating style guide, add code guide context if available
          if (codeGuideContext) ideaData.codeGuideContent = codeGuideContext;
      }
  
  
      // Create the prompt using the detailed ideaData
      const prompt = this.createPrompt(ideaData);
      const modelName = ideaData.aiModel || this.defaultModel;
  
      try {
        const response = await fetch(`${this.baseApiUrl}${modelName}:generateContent?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 25192,
            }
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
  
        const data = await response.json();
  
        // CHANGED: Determine title dynamically
        let fileTitle;
        if (fileType === 'code') {
            const languageName = this.getLanguageDisplayName(ideaData.primaryLanguage);
            fileTitle = `${projectData.title} - ${languageName} Guide`;
        } else { // style
            fileTitle = `${projectData.title} - Style Guide`;
        }
  
        // Process the additional file, returning the generic fileType 'code' or 'style'
        return {
          title: fileTitle,
          content: data.candidates[0].content.parts[0].text,
          timestamp: new Date().toISOString(),
          fileType: fileType, // Return 'code' or 'style'
          parentId: projectData.id // Link to the parent project
        };
  
      } catch (error) {
        console.error(`Error generating ${fileType} guide:`, error);
        throw error;
      }
    }
  
  
    async generateSurpriseIdea(ideaData) {
      if (!this.apiKey) {
        throw new Error('API key not set. Please add your Gemini API key.');
      }
  
      const prompt = this.createSurprisePrompt(ideaData);
  
      try {
        const response = await fetch(`${this.baseApiUrl}${this.featureSuggestionModel}:generateContent?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.8, // Higher temperature for more creative suggestions
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
  
        const data = await response.json();
        return this.processSurpriseIdea(data);
      } catch (error) {
        console.error('Error calling Gemini API for surprise idea:', error);
        throw error;
      }
    }
  
    createSurprisePrompt(ideaData) {
      return `
      Based on the following ${ideaData.appName ? 'application name' : ''} ${ideaData.appName && ideaData.description ? 'and' : ''} ${ideaData.description ? 'description' : ''},
      please generate a complete and creative app idea form data.
  
      ${ideaData.appName ? `Application Name: ${ideaData.appName}` : ''}
      ${ideaData.description ? `Description: ${ideaData.description}` : ''}
  
      Please return a JSON object with the following properties:
  
      {
        "appName": "Name of the application",
        "description": "A detailed description of what the application does",
        "architecture": "One of: frontend, fullstack, backend, mobile, desktop",
        "primaryLanguage": "One of: javascript, typescript, python, java, csharp, go, rust, swift, kotlin, php",
        "appType": "One of: web, mobile, desktop, api, game, ai, iot",
        "complexity": "One of: basic, moderate, advanced, enterprise",
        "experienceLevel": "One of: beginner, intermediate, advanced, none",
        "frameworks": ["List of frameworks/libraries that make sense for this application"],
        "tools": ["List of developer tools that would be helpful"],
        "features": "A list of 5-10 key features formatted as a numbered list",
        "targetAudience": "Who this application is designed for"
      }
  
      Be creative but realistic - the application should be technically feasible with the technologies you suggest.
      Make sure the selected language is appropriate for the application architecture.
      Return ONLY the JSON with no additional explanation or markdown formatting.
      `;
    }
  
    processSurpriseIdea(response) {
      if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
        throw new Error('Invalid response format from API');
      }
  
      const textResponse = response.candidates[0].content.parts[0].text.trim();
  
      try {
        // Try to parse the response as JSON directly
        return JSON.parse(textResponse);
      } catch (e) {
        // If direct parsing fails, try to extract JSON from the response
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
  
        // If all else fails, throw an error
        console.error('Failed to parse surprise idea:', e);
        throw new Error('Could not parse surprise idea from API response');
      }
    }
  
    async generateFeatureSuggestions(ideaData) {
      if (!this.apiKey) {
        throw new Error('API key not set. Please add your Gemini API key.');
      }
  
      const prompt = this.createFeatureSuggestionPrompt(ideaData);
  
      try {
        const response = await fetch(`${this.baseApiUrl}${this.featureSuggestionModel}:generateContent?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
  
        const data = await response.json();
        return this.processFeatureSuggestions(data);
      } catch (error) {
        console.error('Error calling Gemini API for feature suggestions:', error);
        throw error;
      }
    }
  
    createFeatureSuggestionPrompt(ideaData) {
      return `
      Generate 20 potential features for an application with the following details:
  
      Application Name: ${ideaData.appName}
      Description: ${ideaData.description}
      Primary Language: ${ideaData.primaryLanguage}
      Application Type: ${ideaData.appType ? this.formatAppType(ideaData.appType) : 'Not specified'}
      Frameworks/Tools: ${ideaData.frameworks ? ideaData.frameworks.join(', ') : 'Not specified'}
  
      Please provide the features in a JSON array format with exactly 20 features.
      Each feature should be an object with the following structure:
      {
        "id": "unique_id", // A simple unique identifier for the feature
        "name": "Feature Name", // A short name for the feature (3-5 words)
        "description": "Feature description" // A 1-2 sentence description of what the feature does and its benefit
      }
  
      The features should be practical, aligned with the application's purpose, and appropriate for the technologies mentioned.
      Ensure they range from basic core functionality to more advanced features.
  
      Return ONLY the JSON array without explanations, markdown formatting, or code blocks.
      `;
    }
  
    processFeatureSuggestions(response) {
      if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
        throw new Error('Invalid response format from API');
      }
  
      const textResponse = response.candidates[0].content.parts[0].text.trim();
  
      try {
        // Try to parse the response as JSON directly
        return JSON.parse(textResponse);
      } catch (e) {
        // If direct parsing fails, try to extract JSON from the response
        const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
  
        // If all else fails, return an empty array
        console.error('Failed to parse feature suggestions:', e);
        throw new Error('Could not parse feature suggestions from API response');
      }
    }
  
    createPrompt(ideaData) {
      // Add experience level to tailor the guide
      const experienceLevelPrompt = ideaData.experienceLevel ?
        `The guide should be tailored for someone with ${ideaData.experienceLevel} coding experience.` : '';
  
      // Add app type information
      const appTypePrompt = ideaData.appType ?
        `This will be a ${this.formatAppType(ideaData.appType)}.` : '';
  
      // Format features, including selected and deferred features
      let featuresText = '';
      if (ideaData.selectedFeatures && ideaData.selectedFeatures.length > 0) {
        featuresText += "Core Features to implement:\n";
        ideaData.selectedFeatures.forEach((feature, index) => {
          featuresText += `${index + 1}. ${feature.name}: ${feature.description}\n`;
        });
      }
  
      if (ideaData.deferredFeatures && ideaData.deferredFeatures.length > 0) {
        featuresText += "\nFuture Features (to implement later):\n";
        ideaData.deferredFeatures.forEach((feature, index) => {
          featuresText += `${index + 1}. ${feature.name}: ${feature.description}\n`;
        });
      }
  
      if (!featuresText && ideaData.features) {
        featuresText = ideaData.features;
      }
  
      // CHANGED: Use generic fileType ('buildGuide', 'code', 'style') passed in ideaData
      const fileType = ideaData.fileType || 'buildGuide';
  
      // Select the prompt based on file type
      if (fileType === 'code') { // CHANGED: Use 'code'
        return this.createCodeDocPrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt);
      } else if (fileType === 'style') { // CHANGED: Use 'style'
        return this.createStyleDocPrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt);
      } else {
        // Default to build guide
        return this.createBuildGuidePrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt);
      }
    }
  
    createBuildGuidePrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt) {
      // Include AI model information if this is an AI application
      const aiModelInfo = ideaData.aiModelInfo ?
        `\nLatest AI Model Information (as of ${ideaData.aiModelInfo.lastUpdated}):\n${JSON.stringify(ideaData.aiModelInfo, null, 2)}\n` : '';
  
      return `
      Create a comprehensive Markdown build guide for an application called "${ideaData.appName}".
  
      Application Details:
      - Description: ${ideaData.description}
      - Primary Language: ${ideaData.primaryLanguage}
      - Application Type: ${appTypePrompt}
      - Frameworks/Tools: ${ideaData.frameworks.join(', ')}
      - Features: ${featuresText}
      - Target Audience: ${ideaData.targetAudience}
      ${aiModelInfo}
  
      Please generate a complete and AI coding focused build guide for this application in Markdown format.
      ${experienceLevelPrompt}
  
      The guide should include:
  
      1. Project Overview
      2. Technical Stack (with detailed explanations of why each technology was chosen)
      3. System Architecture (with components and their interactions)
      4. Feature Implementation Details (current and planned features)
      5. Development Roadmap
      6. Setup Instructions ${ideaData.experienceLevel === 'beginner' || ideaData.experienceLevel === 'none' ? '(beginner-friendly with detailed steps)' : ''}
      7. File Structure (organized in a clear way)
      8. Best Practices for Implementation
      9. Potential Challenges and Solutions
      10. A changelog template to track version history
      11. Instructions for AI assistants on how to navigate and update the project${ideaData.aiModelInfo ? '\n12. AI Model Integration Guide with current model capabilities' : ''}
  
      Format the output as clean Markdown that renders well and follows best practices.
      Include code examples where relevant.
      The guide should be comprehensive enough that a developer could implement the application based on these specifications.
  
      Return ONLY the markdown content, properly formatted.`;
    }
  
    // CHANGED: Renamed from createJSDocPrompt and made language-aware
    createCodeDocPrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt) {
      // Get language details from ideaData (passed by app.js)
      const languageName = this.getLanguageDisplayName(ideaData.primaryLanguage);
      const languageExtension = ideaData.fileExtension || (this.languageFileTypes[ideaData.primaryLanguage] || { code: 'code' }).code;
  
      // Include the build guide content if available
      const buildGuideContext = ideaData.buildGuideContent ?
        `\nI'm including the main Build Guide content for context and consistency:\n\n---BUILD GUIDE CONTENT---\n${ideaData.buildGuideContent}\n---END BUILD GUIDE CONTENT---\n` : '';
  
      // CHANGED: Include Style guide content if available (using generic key)
      const styleGuideContext = ideaData.styleGuideContent ?
        `\nI'm including the Style Guide content for consistency:\n\n---STYLE GUIDE CONTENT---\n${ideaData.styleGuideContent}\n---END STYLE GUIDE CONTENT---\n` : '';
  
      // Include AI model information if this is an AI application
      const aiModelInfo = ideaData.aiModelInfo ?
        `\nLatest AI Model Information (as of ${ideaData.aiModelInfo.lastUpdated}):\n${JSON.stringify(ideaData.aiModelInfo, null, 2)}\n` : '';
  
      // CHANGED: Prompt is now dynamic based on language
      return `
      Create a detailed ${languageName} implementation guide in Markdown format for an application called "${ideaData.appName}".
  
      Application Details:
      - Description: ${ideaData.description}
      - Primary Language: ${ideaData.primaryLanguage}
      - Application Type: ${appTypePrompt}
      - Frameworks/Tools: ${ideaData.frameworks.join(', ')}
      - Features: ${featuresText}
      - Target Audience: ${ideaData.targetAudience}
      ${aiModelInfo}
  
      ${experienceLevelPrompt}
  
      This ${languageExtension.toUpperCase()}.md file should focus specifically on ${languageName} implementation details including:
  
      1. ${languageName} Architecture Overview
      2. Core ${languageName} Functions and Classes/Modules
      3. API Integration (if applicable)
      4. State Management Approach (if applicable)
      5. Event Handling / Control Flow
      6. Data Processing Logic
      7. Code Examples for Key Features (using ${languageName})
      8. Performance Optimization Tips for ${languageName}
      9. Testing Strategies for ${languageName} code
      10. Integration with UI components or other parts of the system
  
      Include actual ${languageName} code examples that demonstrate implementation of the key features.
      For complex features, include step-by-step implementation details.
      Organize the document in a way that developers can use it as a reference during implementation.
  
      Make sure your ${languageName} implementation guide is consistent with the other documentation (Build Guide, Style Guide) and follows the same architectural approach.
      ${buildGuideContext}
      ${styleGuideContext}
  
      Return ONLY the markdown content, properly formatted.`;
    }
  
    // CHANGED: Renamed from createCSSDocPrompt to createStyleDocPrompt
    createStyleDocPrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt) {
      // Include the build guide content if available
      const buildGuideContext = ideaData.buildGuideContent ?
        `\nI'm including the main Build Guide content for context and consistency:\n\n---BUILD GUIDE CONTENT---\n${ideaData.buildGuideContent}\n---END BUILD GUIDE CONTENT---\n` : '';
  
      // CHANGED: Include Code guide content if available (using generic key)
      const codeGuideContext = ideaData.codeGuideContent ?
        `\nI'm including the Code (${this.getLanguageDisplayName(ideaData.primaryLanguage)}) Guide content for consistency:\n\n---CODE GUIDE CONTENT---\n${ideaData.codeGuideContent}\n---END CODE GUIDE CONTENT---\n` : '';
  
      // Include AI model information if this is an AI application
      const aiModelInfo = ideaData.aiModelInfo ?
        `\nLatest AI Model Information (as of ${ideaData.aiModelInfo.lastUpdated}):\n${JSON.stringify(ideaData.aiModelInfo, null, 2)}\n` : '';
  
      // CHANGED: Style guide prompt (mostly the same content, just ensuring consistency)
      // You might want to make the *type* of style guide dynamic too (e.g., CSS vs Sass vs specific UI lib styles)
      // For now, keeping it focused on general styling concepts often covered by CSS.
      const styleExtension = (this.languageFileTypes[ideaData.primaryLanguage] || { style: 'css' }).style;
  
      return `
      Create a detailed Styling guide (e.g., CSS, UI components) in Markdown format for an application called "${ideaData.appName}".
  
      Application Details:
      - Description: ${ideaData.description}
      - Primary Language: ${ideaData.primaryLanguage}
      - Application Type: ${appTypePrompt}
      - Frameworks/Tools: ${ideaData.frameworks.join(', ')}
      - Features: ${featuresText}
      - Target Audience: ${ideaData.targetAudience}
      ${aiModelInfo}
  
      ${experienceLevelPrompt}
  
      This ${styleExtension.toUpperCase()}.md file should focus specifically on styling and UI implementation details including:
  
      1. UI/UX Design Philosophy Overview
      2. Color Palette (with Hex/RGB values)
      3. Typography Guidelines (Fonts, sizes, weights)
      4. Layout System (e.g., Grid/Flexbox usage, spacing units)
      5. Component Styling Patterns (How common UI elements should look and behave)
      6. Responsive Design Strategy (Breakpoints, mobile-first approach, etc.)
      7. Animation and Transition Specifications (if any)
      8. CSS Variables / Theming Structure (if applicable)
      9. CSS Architecture / Naming Conventions (e.g., BEM, SMACSS, Utility Classes)
      10. Style Code Examples for Key Components (using ${styleExtension} or relevant framework syntax)
  
      Include actual ${styleExtension} code examples (or relevant framework code like JSX with Tailwind/Styled Components) that demonstrate styling for key components and features.
      For complex UI elements, include detailed styling instructions.
      Provide guidance on maintaining style consistency across the application.
  
      Make sure your styling guide is consistent with the other documentation (Build Guide, Code Guide) and follows the same design approach.
      ${buildGuideContext}
      ${codeGuideContext}
  
      Return ONLY the markdown content, properly formatted.`;
    }
  
    processMultipleFiles(response, ideaData) {
        // This function seems less relevant now as generation is per-file type.
        // Keeping it for potential future use, but ensure it aligns with the new file types.
      const textResponse = response.candidates[0].content.parts[0].text;
      const timestamp = new Date().toISOString();
  
      return {
        title: ideaData.appName, // Or a more specific title based on ideaData.fileType?
        content: textResponse,
        timestamp: timestamp,
        fileType: ideaData.fileType || 'buildGuide' // 'buildGuide', 'code', 'style'
      };
    }
  
    processResponse(response, appName) {
      if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
        throw new Error('Invalid response format from API');
      }
  
      const textResponse = response.candidates[0].content.parts[0].text;
  
      // Create a proper JSON structure for the Markdown file
      return {
        title: appName,
        content: textResponse,
        timestamp: new Date().toISOString(),
        // Note: This function is mainly for the initial build guide, so fileType isn't added here.
        // It's added explicitly when saving the project in app.js or returned by generateAdditionalFile.
      };
    }
  
    formatAppType(appType) {
      const appTypeMap = {
        'web': 'web application',
        'mobile': 'mobile application',
        'desktop': 'desktop application',
        'api': 'API/backend service',
        'game': 'game',
        'ai': 'AI/ML application',
        'iot': 'IoT application'
      };
  
      return appTypeMap[appType] || appType;
    }
  }
  
  // Export the API handler
  const apiHandler = new GeminiAPI();
  export default apiHandler;