/**
 * Information about latest AI models for reference
 * Last updated: April 1, 2025
 */

// Latest AI models organized by provider
const aiModels = {
  // Google models
  google: [
    {
      name: 'Gemini 2.5 Pro Experimental',
      codeName: 'gemini-2.5-pro-exp-03-25',
      releaseDate: '2025-03',
      description: 'Google\'s most advanced "thinking" model with a 1M token context window',
      strengths: ['Advanced reasoning', 'Large context window', 'In-depth analysis'],
      availability: 'Google AI Studio and Gemini Advanced'
    },
    {
      name: 'Gemini 2.0 Flash',
      codeName: 'gemini-2.0-flash-001',
      releaseDate: '2025-01',
      description: 'Fast multimodal model optimized for speed',
      strengths: ['Speed', 'Multimodal capabilities', 'Efficient processing'],
      availability: 'Gemini API'
    }
  ],
  
  // OpenAI models
  openai: [
    {
      name: 'GPT-4o',
      codeName: 'gpt-4o-2025-03',
      releaseDate: '2025-03',
      description: 'Advanced multimodal model with native image generation',
      strengths: ['Image generation', 'Multimodal reasoning', 'High accuracy'],
      availability: 'ChatGPT and API'
    },
    {
      name: 'o3-mini',
      codeName: 'o3-mini-2025-02',
      releaseDate: '2025-02',
      description: 'Advanced reasoning model optimized for STEM tasks and coding',
      strengths: ['STEM tasks', 'Coding', 'Compact size'],
      availability: 'OpenAI API'
    }
  ],
  
  // Anthropic models
  anthropic: [
    {
      name: 'Claude 3.7 Sonnet',
      codeName: 'claude-3.7-sonnet-2025-03',
      releaseDate: '2025-03',
      description: 'High-performance model for workplace AI applications',
      strengths: ['Workplace AI', 'Benchmark performance', 'Balanced capabilities'],
      availability: 'Anthropic API'
    },
    {
      name: 'Claude 3.5 Sonnet',
      codeName: 'claude-3.5-sonnet-2024-12',
      releaseDate: '2024-12',
      description: 'Balanced model with competitive performance at lower cost',
      strengths: ['Cost efficiency', 'Speed', 'Comparable to GPT-4o'],
      availability: 'Anthropic API'
    }
  ]
};

// Get all models as a flat array
const getAllModels = () => {
  return [
    ...aiModels.google,
    ...aiModels.openai,
    ...aiModels.anthropic
  ];
};

// Get the most recent models across all providers
const getMostRecentModels = (count = 4) => {
  return getAllModels()
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .slice(0, count);
};

// Get all models from a specific provider
const getProviderModels = (provider) => {
  return aiModels[provider] || [];
};

// Generate HTML for displaying model information
const generateModelInfoHTML = () => {
  let html = '<div class="ai-models-info">';
  html += '<h3>Latest AI Models (April 2025)</h3>';
  html += '<p>These cutting-edge AI models can be integrated into your application:</p>';
  
  // Google section
  html += '<div class="model-provider-section">';
  html += '<h4>Google Models</h4>';
  html += '<ul>';
  aiModels.google.forEach(model => {
    html += `<li><strong>${model.name}</strong> (${model.codeName}): ${model.description}</li>`;
  });
  html += '</ul>';
  html += '</div>';
  
  // OpenAI section
  html += '<div class="model-provider-section">';
  html += '<h4>OpenAI Models</h4>';
  html += '<ul>';
  aiModels.openai.forEach(model => {
    html += `<li><strong>${model.name}</strong> (${model.codeName}): ${model.description}</li>`;
  });
  html += '</ul>';
  html += '</div>';
  
  // Anthropic section
  html += '<div class="model-provider-section">';
  html += '<h4>Anthropic Models</h4>';
  html += '<ul>';
  aiModels.anthropic.forEach(model => {
    html += `<li><strong>${model.name}</strong> (${model.codeName}): ${model.description}</li>`;
  });
  html += '</ul>';
  html += '</div>';
  
  html += '</div>';
  return html;
};

// Export the models and utility functions
export { 
  aiModels, 
  getAllModels, 
  getMostRecentModels, 
  getProviderModels,
  generateModelInfoHTML
};