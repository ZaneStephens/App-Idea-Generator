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
            maxOutputTokens: modelName.includes('flash') ? 8096 : 12192, // Smaller for flash model
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

  async generateAdditionalFile(projectData, fileType) {
    if (!this.apiKey) {
      throw new Error('API key not set. Please add your Gemini API key.');
    }
    
    // Use the same project data but specify the file type
    const ideaData = {
      ...projectData.data,
      fileType: fileType // 'js' or 'css'
    };
    
    // Always include the build guide for context and consistency
    ideaData.buildGuideContent = projectData.content;
    
    // If there are associated files, check for existing guides
    if (projectData.associatedFiles && Array.isArray(projectData.associatedFiles)) {
      // When generating JS guide, check if CSS exists and vice versa
      const otherFileType = fileType === 'js' ? 'css' : 'js';
      const otherFile = projectData.associatedFiles.find(file => file.fileType === otherFileType);
      
      if (otherFile) {
        // Add the other file's content for context
        ideaData[`${otherFileType}GuideContent`] = otherFile.content;
      }
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
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 15192,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Process the additional file
      return {
        title: `${projectData.title} - ${fileType === 'js' ? 'JavaScript' : 'CSS'} Guide`,
        content: data.candidates[0].content.parts[0].text,
        timestamp: new Date().toISOString(),
        fileType: fileType,
        parentId: projectData.id // Link to the parent project
      };
      
    } catch (error) {
      console.error(`Error generating ${fileType.toUpperCase()}.md file:`, error);
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
            maxOutputTokens: 10096,
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
            maxOutputTokens: 10048,
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
    
    // Determine which type of file to generate
    const fileType = ideaData.fileType || 'buildGuide';
      
    // Select the prompt based on file type
    if (fileType === 'js') {
      return this.createJSDocPrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt);
    } else if (fileType === 'css') {
      return this.createCSSDocPrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt);
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
  
  createJSDocPrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt) {
    // Include the build guide content if available
    const buildGuideContext = ideaData.buildGuideContent ? 
      `\nI'm including the main Build Guide content for context and consistency:\n\n---BUILD GUIDE CONTENT---\n${ideaData.buildGuideContent}\n---END BUILD GUIDE CONTENT---\n` : '';
    
    // Include CSS guide content if available
    const cssGuideContext = ideaData.cssGuideContent ? 
      `\nI'm including the CSS Guide content for consistency:\n\n---CSS GUIDE CONTENT---\n${ideaData.cssGuideContent}\n---END CSS GUIDE CONTENT---\n` : '';
    
    // Include AI model information if this is an AI application
    const aiModelInfo = ideaData.aiModelInfo ? 
      `\nLatest AI Model Information (as of ${ideaData.aiModelInfo.lastUpdated}):\n${JSON.stringify(ideaData.aiModelInfo, null, 2)}\n` : '';
    
    return `
    Create a detailed JavaScript implementation guide in Markdown format for an application called "${ideaData.appName}". 
    
    Application Details:
    - Description: ${ideaData.description}
    - Primary Language: ${ideaData.primaryLanguage}
    - Application Type: ${appTypePrompt}
    - Frameworks/Tools: ${ideaData.frameworks.join(', ')}
    - Features: ${featuresText}
    - Target Audience: ${ideaData.targetAudience}
    ${aiModelInfo}
    
    ${experienceLevelPrompt}
    
    This JS.md file should focus specifically on JavaScript implementation details including:
    
    1. JavaScript Architecture Overview
    2. Core JavaScript Functions and Classes
    3. API Integration (if applicable)
    4. State Management Approach
    5. Event Handling
    6. Data Processing Logic
    7. Code Examples for Key Features
    8. Performance Optimization Tips
    9. Testing Strategies for JavaScript
    10. Integration with HTML/CSS
    
    Include actual code examples that demonstrate implementation of the key features.
    For complex features, include step-by-step implementation details.
    Organize the document in a way that developers can use it as a reference during implementation.
    
    Make sure your JavaScript implementation guide is consistent with the other documentation and follows the same architectural approach.
    ${buildGuideContext}
    ${cssGuideContext}
    
    Return ONLY the markdown content, properly formatted.`;
  }
  
  createCSSDocPrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt) {
    // Include the build guide content if available
    const buildGuideContext = ideaData.buildGuideContent ? 
      `\nI'm including the main Build Guide content for context and consistency:\n\n---BUILD GUIDE CONTENT---\n${ideaData.buildGuideContent}\n---END BUILD GUIDE CONTENT---\n` : '';
    
    // Include JS guide content if available
    const jsGuideContext = ideaData.jsGuideContent ? 
      `\nI'm including the JavaScript Guide content for consistency:\n\n---JS GUIDE CONTENT---\n${ideaData.jsGuideContent}\n---END JS GUIDE CONTENT---\n` : '';
    
    // Include AI model information if this is an AI application
    const aiModelInfo = ideaData.aiModelInfo ? 
      `\nLatest AI Model Information (as of ${ideaData.aiModelInfo.lastUpdated}):\n${JSON.stringify(ideaData.aiModelInfo, null, 2)}\n` : '';
    
    return `
    Create a detailed CSS/styling guide in Markdown format for an application called "${ideaData.appName}". 
    
    Application Details:
    - Description: ${ideaData.description}
    - Primary Language: ${ideaData.primaryLanguage}
    - Application Type: ${appTypePrompt}
    - Frameworks/Tools: ${ideaData.frameworks.join(', ')}
    - Features: ${featuresText}
    - Target Audience: ${ideaData.targetAudience}
    ${aiModelInfo}
    
    ${experienceLevelPrompt}
    
    This CSS.md file should focus specifically on styling and UI implementation details including:
    
    1. UI/UX Design Philosophy
    2. Color Palette with Hex Values
    3. Typography Guidelines
    4. Layout System (Grid/Flexbox usage)
    5. Component Styling Patterns
    6. Responsive Design Strategy
    7. Animation and Transition Specifications
    8. CSS Variables and Theme Structure
    9. CSS Architecture (BEM, SMACSS, etc)
    10. CSS Code Examples for Key Components
    
    Include actual CSS code examples that demonstrate styling for key components and features.
    For complex UI elements, include detailed styling instructions.
    Provide guidance on maintaining style consistency across the application.
    
    Make sure your CSS styling guide is consistent with the other documentation and follows the same design approach.
    ${buildGuideContext}
    ${jsGuideContext}
    
    Return ONLY the markdown content, properly formatted.`;
  }

  processMultipleFiles(response, ideaData) {
    const textResponse = response.candidates[0].content.parts[0].text;
    const timestamp = new Date().toISOString();
    
    return {
      title: ideaData.appName,
      content: textResponse,
      timestamp: timestamp,
      fileType: ideaData.fileType || 'buildGuide'
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