/**
 * Main application logic for the App Idea Generator
 */

import apiHandler from './api.js';
import { frameworksData, databaseTechnologies, cloudPlatforms, commonTools } from './frameworks.js';
import { aiModels, getAllModels, getMostRecentModels } from './ai-models.js';

class AppIdeaGenerator {
  constructor() {
    this.projects = this.loadProjects();
    this.currentProject = null;
    this.currentFiles = new Map(); // Map to store all files for a project (main guide, JS, CSS)
    this.currentFileType = 'buildGuide'; // Default to the main build guide
    this.suggestedFeatures = [];
    this.selectedFeatures = [];
    this.deferredFeatures = [];
    this.architectureFilters = {
      'frontend': ['javascript', 'typescript'],
      'fullstack': ['javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust', 'php'],
      'backend': ['javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust', 'php'],
      'mobile': ['javascript', 'typescript', 'java', 'swift', 'kotlin'],
      'desktop': ['javascript', 'typescript', 'csharp', 'java', 'python', 'rust']
    };
    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    // Add event listeners
    this.setupEventListeners();
    
    // Check if API key is set
    this.checkApiKey();
    
    // Display saved projects
    this.renderProjectsList();
    
    // Initialize the language selector
    this.initLanguageSelector();

    // Check URL for direct project link
    this.checkUrlForProject();
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Form submission
    document.getElementById('idea-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });
    
    // Application architecture change
    document.getElementById('app-architecture').addEventListener('change', (e) => {
      this.filterLanguagesByArchitecture(e.target.value);
    });
    
    // Language selector change
    document.getElementById('primary-language').addEventListener('change', (e) => {
      this.updateFrameworksList(e.target.value);
    });
    
    // Application type change
    document.getElementById('app-type').addEventListener('change', (e) => {
      // You could add functionality to suggest frameworks based on app type
      this.suggestToolsForAppType(e.target.value);
    });
    
    // Surprise me button
    document.getElementById('surprise-me-btn').addEventListener('click', () => {
      this.handleSurpriseMe();
    });
    
    // Output actions
    document.getElementById('copy-btn').addEventListener('click', () => this.copyOutputToClipboard());
    document.getElementById('download-btn').addEventListener('click', () => this.downloadAsMarkdown());
    document.getElementById('close-output-btn').addEventListener('click', () => this.hideOutput());
    
    // API key input
    document.getElementById('api-key-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const key = document.getElementById('api-key-input').value.trim();
      if (key) {
        apiHandler.setApiKey(key);
        document.getElementById('api-key-modal').classList.remove('show');
        this.showNotification('API key saved successfully!', 'success');
      }
    });

    // Feature suggestion button
    document.getElementById('suggest-features-btn').addEventListener('click', () => {
      this.handleFeatureSuggestion();
    });
    
    // Add this line to your setupEventListeners method
document.getElementById('delete-file-btn').addEventListener('click', () => this.deleteCurrentFile());

    // Tab buttons for feature suggestions
    document.querySelectorAll('.tab-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const tabId = e.target.getAttribute('data-tab');
        this.switchFeatureTab(tabId);
      });
    });

    // Output file selection
    document.querySelectorAll('input[name="output-files"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateOutputFiles();
      });
    });

    // Additional file generation buttons
    document.getElementById('js-file-btn').addEventListener('click', () => {
      this.handleAdditionalFileGeneration('js');
    });
    
    document.getElementById('css-file-btn').addEventListener('click', () => {
      this.handleAdditionalFileGeneration('css');
    });
  }

  /**
   * Filter available languages based on selected architecture
   */
  filterLanguagesByArchitecture(architecture) {
    const primaryLanguageSelect = document.getElementById('primary-language');
    const options = primaryLanguageSelect.options;
    
    // Reset all options first
    for (let i = 0; i < options.length; i++) {
      options[i].classList.remove('hidden');
      options[i].disabled = false;
    }
    
    if (!architecture || !this.architectureFilters[architecture]) {
      return; // No filtering needed
    }
    
    // Get allowed languages for this architecture
    const allowedLanguages = this.architectureFilters[architecture];
    
    // Hide/disable options that don't match
    for (let i = 0; i < options.length; i++) {
      const value = options[i].value;
      if (value && !allowedLanguages.includes(value)) {
        options[i].classList.add('hidden');
        options[i].disabled = true;
      }
    }
    
    // Reset selection if current selection is invalid
    if (primaryLanguageSelect.value && !allowedLanguages.includes(primaryLanguageSelect.value)) {
      primaryLanguageSelect.value = '';
      // Also reset frameworks
      this.updateFrameworksList('');
    }
  }

  /**
   * Handle the "Surprise Me" feature
   */
  async handleSurpriseMe() {
    try {
      // Check if we have enough information (need at least app name or description)
      const appName = document.getElementById('app-name').value;
      const description = document.getElementById('app-description').value;
      
      if (!appName && !description) {
        this.showNotification('Please fill in at least the application name or description', 'error');
        return;
      }
      
      // Show loading indicator
      document.getElementById('loading-overlay').classList.add('show');
      document.getElementById('loading-overlay').querySelector('p').textContent = 'Creating your surprise app idea...';
      
      // Collect minimal form data
      const ideaData = {
        appName,
        description
      };
      
      // Call API to generate full form data suggestions
      const result = await apiHandler.generateSurpriseIdea(ideaData);
      
      // Populate form fields with the surprise data
      this.populateFormWithSurpriseData(result);
      
    } catch (error) {
      this.showNotification(`Error: ${error.message}`, 'error');
    } finally {
      // Hide loading indicator
      document.getElementById('loading-overlay').classList.remove('show');
    }
  }

  /**
   * Populate form with surprise data
   */
  populateFormWithSurpriseData(surpriseData) {
    // Set basic fields
    if (surpriseData.appName) {
      document.getElementById('app-name').value = surpriseData.appName;
    }
    
    if (surpriseData.description) {
      document.getElementById('app-description').value = surpriseData.description;
    }
    
    // Set dropdowns
    if (surpriseData.architecture) {
      document.getElementById('app-architecture').value = surpriseData.architecture;
      this.filterLanguagesByArchitecture(surpriseData.architecture);
    }
    
    if (surpriseData.primaryLanguage) {
      document.getElementById('primary-language').value = surpriseData.primaryLanguage;
      this.updateFrameworksList(surpriseData.primaryLanguage);
    }
    
    if (surpriseData.appType) {
      document.getElementById('app-type').value = surpriseData.appType;
    }
    
    if (surpriseData.complexity) {
      document.getElementById('app-complexity').value = surpriseData.complexity;
    }
    
    if (surpriseData.experienceLevel) {
      document.getElementById('experience-level').value = surpriseData.experienceLevel;
    }
    
    // Set frameworks & tools checkboxes
    if (surpriseData.frameworks && Array.isArray(surpriseData.frameworks)) {
      // First uncheck all
      document.querySelectorAll('input[name="frameworks"]').forEach(checkbox => {
        checkbox.checked = false;
      });
      
      // Then check the suggested ones
      surpriseData.frameworks.forEach(framework => {
        const checkbox = document.querySelector(`input[name="frameworks"][data-name="${framework}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    
    // Set beginner tools checkboxes
    if (surpriseData.tools && Array.isArray(surpriseData.tools)) {
      // First uncheck all
      document.querySelectorAll('input[name="vibe-tools"]').forEach(checkbox => {
        checkbox.checked = false;
      });
      
      // Then check the suggested ones
      surpriseData.tools.forEach(tool => {
        const checkbox = document.querySelector(`input[name="vibe-tools"][data-name="${tool}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    
    // Set features
    if (surpriseData.features) {
      document.getElementById('features').value = surpriseData.features;
    }
    
    // Set target audience
    if (surpriseData.targetAudience) {
      document.getElementById('target-audience').value = surpriseData.targetAudience;
    }
    
    // Show notification
    this.showNotification('Form filled with surprise app idea!', 'success');
  }

  /**
   * Suggest tools based on app type
   */
  suggestToolsForAppType(appType) {
    // This is optional functionality to suggest specific tools based on app type
    // For example, if web is selected, suggest VSCode, GitHub, etc.
    if (appType === 'web') {
      document.getElementById('vscode').checked = true;
      document.getElementById('github').checked = true;
      document.getElementById('netlify').checked = true;
    } else if (appType === 'mobile') {
      document.getElementById('figma').checked = true;
      document.getElementById('firebase').checked = true;
    }
  }

  /**
   * Check if the Gemini API key is set
   */
  checkApiKey() {
    if (!apiHandler.apiKey) {
      document.getElementById('api-key-modal').classList.add('show');
    }
  }

  /**
   * Initialize language selector with options
   */
  initLanguageSelector() {
    // Language selector is already in the HTML
    
    // Initialize frameworks selector with empty state
    this.updateFrameworksList('');
  }

  /**
   * Update frameworks list based on selected language
   */
  updateFrameworksList(language) {
    const container = document.getElementById('frameworks-container');
    container.innerHTML = '';
    
    if (!language) return;
    
    // Get frameworks for the selected language
    const frameworks = frameworksData[language] || [];
    
    // Add frameworks specific to the selected language
    if (frameworks.length > 0) {
      const frameworksGroup = document.createElement('div');
      frameworksGroup.classList.add('framework-group');
      frameworksGroup.innerHTML = `<h4>${language.charAt(0).toUpperCase() + language.slice(1)} Frameworks/Libraries</h4>`;
      
      frameworks.forEach(framework => {
        const checkbox = this.createCheckboxItem(framework);
        frameworksGroup.appendChild(checkbox);
      });
      
      container.appendChild(frameworksGroup);
    }
    
    // Add databases section
    const dbGroup = document.createElement('div');
    dbGroup.classList.add('framework-group');
    dbGroup.innerHTML = '<h4>Databases</h4>';
    
    databaseTechnologies.forEach(db => {
      const checkbox = this.createCheckboxItem(db);
      dbGroup.appendChild(checkbox);
    });
    
    container.appendChild(dbGroup);
    
    // Add cloud platforms section
    const cloudGroup = document.createElement('div');
    cloudGroup.classList.add('framework-group');
    cloudGroup.innerHTML = '<h4>Cloud Platforms</h4>';
    
    cloudPlatforms.forEach(platform => {
      const checkbox = this.createCheckboxItem(platform);
      cloudGroup.appendChild(checkbox);
    });
    
    container.appendChild(cloudGroup);
    
    // Add common tools section
    const toolsGroup = document.createElement('div');
    toolsGroup.classList.add('framework-group');
    toolsGroup.innerHTML = '<h4>Common Tools</h4>';
    
    commonTools.forEach(tool => {
      const checkbox = this.createCheckboxItem(tool);
      toolsGroup.appendChild(checkbox);
    });
    
    container.appendChild(toolsGroup);
  }

  /**
   * Create checkbox item for framework selection
   */
  createCheckboxItem(item) {
    const div = document.createElement('div');
    div.classList.add('checkbox-item');
    
    div.innerHTML = `
      <label class="checkbox-container" title="${item.description}">
        <input type="checkbox" name="frameworks" value="${item.id}" data-name="${item.name}">
        <span class="checkmark"></span>
        <span class="checkbox-label">${item.name}</span>
        <span class="tooltip">${item.description}</span>
      </label>
    `;
    
    return div;
  }

  /**
   * Handle feature suggestion request
   */
  async handleFeatureSuggestion() {
    try {
      // Check if we have enough information
      const appName = document.getElementById('app-name').value;
      const description = document.getElementById('app-description').value;
      const primaryLanguage = document.getElementById('primary-language').value;
      
      if (!appName || !description || !primaryLanguage) {
        this.showNotification('Please fill in at least the application name, description, and primary language', 'error');
        return;
      }
      
      // Show loading indicator
      document.getElementById('loading-overlay').classList.add('show');
      document.getElementById('loading-overlay').querySelector('p').textContent = 'Generating feature suggestions...';
      
      // Collect current form data
      const ideaData = {
        appName,
        description,
        primaryLanguage,
        appType: document.getElementById('app-type').value,
        frameworks: this.getSelectedFrameworks()
      };
      
      // Call API to generate feature suggestions
      this.suggestedFeatures = await apiHandler.generateFeatureSuggestions(ideaData);
      
      // Display the suggestions
      this.displayFeatureSuggestions();
      
      // Show the feature suggestions container
      document.getElementById('feature-suggestions-container').classList.add('show');
      
    } catch (error) {
      this.showNotification(`Error: ${error.message}`, 'error');
    } finally {
      // Hide loading indicator
      document.getElementById('loading-overlay').classList.remove('show');
    }
  }

  /**
   * Get selected frameworks
   */
  getSelectedFrameworks() {
    const frameworkCheckboxes = document.querySelectorAll('input[name="frameworks"]:checked');
    const frameworks = Array.from(frameworkCheckboxes).map(checkbox => checkbox.getAttribute('data-name'));
    
    const vibeToolsCheckboxes = document.querySelectorAll('input[name="vibe-tools"]:checked');
    const vibeTools = Array.from(vibeToolsCheckboxes).map(checkbox => checkbox.getAttribute('data-name'));
    
    return [...frameworks, ...vibeTools];
  }

  /**
   * Display generated feature suggestions
   */
  displayFeatureSuggestions() {
    const coreFeaturesList = document.getElementById('core-features-list');
    coreFeaturesList.innerHTML = '';
    
    if (this.suggestedFeatures.length === 0) {
      coreFeaturesList.innerHTML = `
        <div class="empty-features">
          <p>No features were suggested. Try modifying your application details.</p>
        </div>
      `;
      return;
    }
    
    // Add each feature as a selectable item
    this.suggestedFeatures.forEach(feature => {
      const featureItem = document.createElement('div');
      featureItem.classList.add('feature-item');
      featureItem.dataset.id = feature.id;
      
      featureItem.innerHTML = `
        <div class="feature-checkbox">
          <input type="checkbox" id="feature-${feature.id}" class="feature-select">
        </div>
        <div class="feature-text">
          <strong>${feature.name}</strong><br>
          ${feature.description}
        </div>
        <div class="feature-actions">
          <button class="feature-action-btn defer-btn" title="Save for future implementation">
            <span class="material-icons">schedule</span>
          </button>
          <button class="feature-action-btn remove-btn" title="Remove suggestion">
            <span class="material-icons">close</span>
          </button>
        </div>
      `;
      
      coreFeaturesList.appendChild(featureItem);
      
      // Add event listeners
      const checkbox = featureItem.querySelector('.feature-select');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedFeatures.push(feature);
        } else {
          this.selectedFeatures = this.selectedFeatures.filter(f => f.id !== feature.id);
        }
        this.updateFeaturesInput();
      });
      
      const deferButton = featureItem.querySelector('.defer-btn');
      deferButton.addEventListener('click', () => {
        this.deferFeature(feature);
        featureItem.remove();
      });
      
      const removeButton = featureItem.querySelector('.remove-btn');
      removeButton.addEventListener('click', () => {
        featureItem.remove();
      });
    });
  }

  /**
   * Defer a feature for later implementation
   */
  deferFeature(feature) {
    // Add to deferred features
    this.deferredFeatures.push(feature);
    
    // Add to the deferred features list
    const deferredList = document.getElementById('deferred-features-list');
    
    // Clear empty state if needed
    if (deferredList.querySelector('.empty-features')) {
      deferredList.innerHTML = '';
    }
    
    const featureItem = document.createElement('div');
    featureItem.classList.add('feature-item');
    featureItem.dataset.id = feature.id;
    
    featureItem.innerHTML = `
      <div class="feature-text">
        <strong>${feature.name}</strong><br>
        ${feature.description}
      </div>
      <div class="feature-actions">
        <button class="feature-action-btn restore-btn" title="Move to core features">
          <span class="material-icons">restore</span>
        </button>
        <button class="feature-action-btn remove-btn" title="Remove suggestion">
          <span class="material-icons">close</span>
        </button>
      </div>
    `;
    
    deferredList.appendChild(featureItem);
    
    // Add event listeners
    const restoreButton = featureItem.querySelector('.restore-btn');
    restoreButton.addEventListener('click', () => {
      this.deferredFeatures = this.deferredFeatures.filter(f => f.id !== feature.id);
      featureItem.remove();
      this.suggestedFeatures.push(feature);
      this.displayFeatureSuggestions();
    });
    
    const removeButton = featureItem.querySelector('.remove-btn');
    removeButton.addEventListener('click', () => {
      this.deferredFeatures = this.deferredFeatures.filter(f => f.id !== feature.id);
      featureItem.remove();
    });
    
    // Update features input
    this.updateFeaturesInput();
  }

  /**
   * Switch between feature tabs
   */
  switchFeatureTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(button => {
      button.classList.remove('active');
    });
    
    // Show the selected tab
    document.getElementById(tabId).classList.add('active');
    
    // Set the button as active
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  }

  /**
   * Update features input field with selected features
   */
  updateFeaturesInput() {
    const featuresInput = document.getElementById('features');
    let featuresText = '';
    
    if (this.selectedFeatures.length > 0) {
      featuresText = this.selectedFeatures.map((feature, index) => 
        `${index + 1}. ${feature.name}: ${feature.description}`
      ).join('\n');
    }
    
    featuresInput.value = featuresText;
  }

  /**
   * Update output file selections
   */
  updateOutputFiles() {
    const outputFiles = Array.from(document.querySelectorAll('input[name="output-files"]:checked'))
      .map(checkbox => ({
        type: checkbox.value,
        name: checkbox.getAttribute('data-name')
      }));
    
    this.outputFiles = outputFiles;
  }

  /**
   * Handle generating additional documentation files (JS/CSS)
   */
  async handleAdditionalFileGeneration(fileType) {
    if (!this.currentProject) {
      this.showNotification('No project selected', 'error');
      return;
    }
    
    // Check if this file already exists
    if (this.currentFiles.has(fileType)) {
      // Just switch to the existing file
      this.switchToFile(fileType);
      return;
    }
    
    try {
      // Show loading indicator
      document.getElementById('loading-overlay').classList.add('show');
      document.getElementById('loading-overlay').querySelector('p').textContent = 
        `Generating ${fileType === 'js' ? 'JavaScript' : 'CSS'} documentation...`;
      
      // Generate the file
      const fileData = await apiHandler.generateAdditionalFile(this.currentProject, fileType);
      
      // Add to the current files
      this.currentFiles.set(fileType, fileData);
      
      // Create tab for the new file
      this.createFileTabs();
      
      // Switch to the new file
      this.switchToFile(fileType);
      
      // Add to project storage
      this.addFileToProject(this.currentProject.id, fileData);
      
      this.showNotification(`${fileType === 'js' ? 'JavaScript' : 'CSS'} guide generated!`, 'success');
    } catch (error) {
      this.showNotification(`Error: ${error.message}`, 'error');
    } finally {
      // Hide loading indicator
      document.getElementById('loading-overlay').classList.remove('show');
    }
  }

  /**
   * Create file tabs for navigation between different documentation files
   */
  createFileTabs() {
    const fileTabs = document.getElementById('file-tabs');
    fileTabs.innerHTML = '';
    
    // Only show tabs if we have more than one file
    if (this.currentFiles.size <= 1) {
      fileTabs.style.display = 'none';
      return;
    }
    
    fileTabs.style.display = 'flex';
    
    // Always add the main build guide tab
    const buildGuideTab = document.createElement('button');
    buildGuideTab.classList.add('file-tab');
    buildGuideTab.textContent = 'Build Guide';
    buildGuideTab.dataset.fileType = 'buildGuide';
    if (this.currentFileType === 'buildGuide') {
      buildGuideTab.classList.add('active');
    }
    fileTabs.appendChild(buildGuideTab);
    
    // Add tab for JS guide if it exists
    if (this.currentFiles.has('js')) {
      const jsTab = document.createElement('button');
      jsTab.classList.add('file-tab');
      jsTab.textContent = 'JavaScript Guide';
      jsTab.dataset.fileType = 'js';
      if (this.currentFileType === 'js') {
        jsTab.classList.add('active');
      }
      fileTabs.appendChild(jsTab);
    }
    
    // Add tab for CSS guide if it exists
    if (this.currentFiles.has('css')) {
      const cssTab = document.createElement('button');
      cssTab.classList.add('file-tab');
      cssTab.textContent = 'CSS Guide';
      cssTab.dataset.fileType = 'css';
      if (this.currentFileType === 'css') {
        cssTab.classList.add('active');
      }
      fileTabs.appendChild(cssTab);
    }
    
    // Add click event listeners
    document.querySelectorAll('.file-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const fileType = e.target.dataset.fileType;
        this.switchToFile(fileType);
      });
    });
  }

  /**
 * Switch between different files of a project
 */
switchToFile(fileType) {
    // Update current file type
    this.currentFileType = fileType;
    
    // Get the file data
    const fileData = this.currentFiles.get(fileType);
    if (!fileData) return;
    
    // Update the output title
    const outputTitle = document.getElementById('output-title');
    if (fileType === 'buildGuide') {
      outputTitle.textContent = this.currentProject.title;
    } else {
      outputTitle.textContent = fileData.title;
    }
    
    // Update the content
    const markdownOutput = document.getElementById('markdown-output');
    const html = DOMPurify.sanitize(marked.parse(fileData.content));
    markdownOutput.innerHTML = html;
    
    // Update active tab
    document.querySelectorAll('.file-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.fileType === fileType) {
        tab.classList.add('active');
      }
    });
    
    // Show/hide delete button based on file type
    const deleteFileBtn = document.getElementById('delete-file-btn');
    if (fileType === 'buildGuide') {
      // Can't delete the main build guide
      deleteFileBtn.style.display = 'none';
    } else {
      // Can delete JS and CSS guides
      deleteFileBtn.style.display = 'flex';
    }
  }
  
  /**
   * Delete the current file (JS or CSS guide)
   */
  deleteCurrentFile() {
    // Can't delete the main build guide
    if (this.currentFileType === 'buildGuide') {
      return;
    }
    
    if (!this.currentProject || !this.currentProject.id) {
      return;
    }
    
    // Ask for confirmation
    if (!confirm(`Are you sure you want to delete this ${this.currentFileType.toUpperCase()} guide?`)) {
      return;
    }
    
    // Find the project index
    const projectIndex = this.projects.findIndex(p => p.id === this.currentProject.id);
    if (projectIndex === -1) return;
    
    // Remove file from associated files
    if (this.projects[projectIndex].associatedFiles) {
      this.projects[projectIndex].associatedFiles = this.projects[projectIndex].associatedFiles.filter(
        file => file.fileType !== this.currentFileType
      );
      
      // Update localStorage
      localStorage.setItem('appIdeaProjects', JSON.stringify(this.projects));
    }
    
    // Remove from current files
    this.currentFiles.delete(this.currentFileType);
    
    // Switch back to build guide
    this.switchToFile('buildGuide');
    
    // Recreate file tabs
    this.createFileTabs();
    
    this.showNotification(`${this.currentFileType === 'js' ? 'JavaScript' : 'CSS'} guide deleted successfully`, 'success');
  }
  
  /**
   * Add a file to a project's associated files
   */
  addFileToProject(projectId, fileData) {
    const projectIndex = this.projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;
    
    // Initialize associatedFiles if it doesn't exist
    if (!this.projects[projectIndex].associatedFiles) {
      this.projects[projectIndex].associatedFiles = [];
    }
    
    // Add the new file
    this.projects[projectIndex].associatedFiles.push(fileData);
    
    // Update in localStorage
    localStorage.setItem('appIdeaProjects', JSON.stringify(this.projects));
  }

  /**
   * Collect form data
   */
  collectFormData() {
    const appName = document.getElementById('app-name').value;
    const description = document.getElementById('app-description').value;
    const primaryLanguage = document.getElementById('primary-language').value;
    const aiModel = document.getElementById('ai-model').value;
    const appType = document.getElementById('app-type').value;
    const appArchitecture = document.getElementById('app-architecture').value;
    const appComplexity = document.getElementById('app-complexity').value;
    const experienceLevel = document.getElementById('experience-level').value;
    
    // Get selected frameworks
    const frameworkCheckboxes = document.querySelectorAll('input[name="frameworks"]:checked');
    const frameworks = Array.from(frameworkCheckboxes).map(checkbox => checkbox.getAttribute('data-name'));
    
    // Get selected beginner tools
    const vibeToolsCheckboxes = document.querySelectorAll('input[name="vibe-tools"]:checked');
    const vibeTools = Array.from(vibeToolsCheckboxes).map(checkbox => checkbox.getAttribute('data-name'));
    
    // Combine all selected tools
    const allTools = [...frameworks, ...vibeTools];
    
    const features = document.getElementById('features').value;
    const targetAudience = document.getElementById('target-audience').value;
    
    // Base data object
    const data = {
      appName,
      description,
      primaryLanguage,
      aiModel,
      appType,
      appArchitecture,
      appComplexity,
      experienceLevel,
      frameworks: allTools,
      features,
      targetAudience,
      selectedFeatures: this.selectedFeatures,
      deferredFeatures: this.deferredFeatures
    };
    
    // Check if this is an AI application or uses AI API calls
    if (appType === 'ai' || allTools.includes('AI API calls')) {
      // Include current AI model information to help with knowledge cutoff
      data.aiModelInfo = {
        lastUpdated: 'April 1, 2025',
        recentModels: getMostRecentModels(4),
        providers: {
          google: aiModels.google,
          openai: aiModels.openai,
          anthropic: aiModels.anthropic
        }
      };
    }
    
    return data;
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit() {
    try {
      // Show loading indicator
      document.getElementById('loading-overlay').classList.add('show');
      document.getElementById('loading-overlay').querySelector('p').textContent = 'Generating your app idea...';
      
      // Gather form data
      const ideaData = this.collectFormData();
      
      // Generate build guide using API
      const result = await apiHandler.generateBuildGuide(ideaData);
      
      // Store the current project and reset current files
      this.currentProject = {
        id: Date.now().toString(),
        ...result,
        data: ideaData
      };
      
      this.currentFiles = new Map();
      this.currentFiles.set('buildGuide', {
        content: result.content,
        title: result.title,
        fileType: 'buildGuide'
      });
      this.currentFileType = 'buildGuide';
      
      // Save project
      this.saveProject(this.currentProject);
      
      // Display the result
      this.displayOutput(this.currentProject);
      
      // Update projects list
      this.renderProjectsList();
      
    } catch (error) {
      this.showNotification(`Error: ${error.message}`, 'error');
    } finally {
      // Hide loading indicator
      document.getElementById('loading-overlay').classList.remove('show');
    }
  }

  /**
   * Display markdown output
   */
  displayOutput(project) {
    // Set output title
    document.getElementById('output-title').textContent = project.title;
    
    // Reset file tabs and set current file
    this.currentFiles = new Map();
    this.currentFileType = 'buildGuide';
    
    // Add the main build guide
    this.currentFiles.set('buildGuide', {
      content: project.content,
      title: project.title,
      fileType: 'buildGuide'
    });
    
    // Add any associated files if they exist
    if (project.associatedFiles && Array.isArray(project.associatedFiles)) {
      project.associatedFiles.forEach(file => {
        this.currentFiles.set(file.fileType, file);
      });
    }
    
    // Create file tabs if needed
    this.createFileTabs();
    
    // Set markdown content for the current file
    const markdownOutput = document.getElementById('markdown-output');
    const html = DOMPurify.sanitize(marked.parse(project.content));
    markdownOutput.innerHTML = html;
    
    // Show output container
    document.getElementById('output-container').classList.add('show');
    
    // Scroll to the output
    document.getElementById('output-container').scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Copy output to clipboard
   */
  copyOutputToClipboard() {
    if (!this.currentProject) return;
    
    navigator.clipboard.writeText(this.currentProject.content)
      .then(() => {
        this.showNotification('Markdown copied to clipboard!', 'success');
      })
      .catch(err => {
        this.showNotification('Failed to copy to clipboard', 'error');
        console.error('Could not copy text: ', err);
      });
  }

  /**
   * Download output as markdown file
   */
  downloadAsMarkdown() {
    if (!this.currentProject) return;
    
    const fileName = `${this.currentProject.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    const blob = new Blob([this.currentProject.content], { type: 'text/markdown' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    
    // Append to the document, click and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showNotification('Markdown file downloaded!', 'success');
  }

  /**
   * Hide output container
   */
  hideOutput() {
    document.getElementById('output-container').classList.remove('show');
  }

  /**
   * Save project to localStorage
   */
  saveProject(project) {
    this.projects.push(project);
    localStorage.setItem('appIdeaProjects', JSON.stringify(this.projects));
  }

  /**
   * Load projects from localStorage
   */
  loadProjects() {
    try {
      const projects = localStorage.getItem('appIdeaProjects');
      return projects ? JSON.parse(projects) : [];
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  }

  /**
   * Render projects list
   */
  renderProjectsList() {
    const projectsList = document.getElementById('projects-list');
    
    if (this.projects.length === 0) {
      projectsList.innerHTML = `
        <div class="empty-state">
          <p>No projects yet. Generate your first app idea!</p>
        </div>
      `;
      return;
    }
    
    // Sort projects by timestamp (newest first)
    const sortedProjects = [...this.projects].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    projectsList.innerHTML = '';
    
    sortedProjects.forEach(project => {
      const projectCard = document.createElement('div');
      projectCard.classList.add('project-card');
      
      // Add app type badge if available (for new projects)
      const appTypeBadge = project.data.appType 
        ? `<span class="app-type-badge">${this.formatAppType(project.data.appType)}</span>` 
        : '';
      
      projectCard.innerHTML = `
        <h3>${project.title}</h3>
        <p class="project-description">${project.data.description.substring(0, 100)}${project.data.description.length > 100 ? '...' : ''}</p>
        <div class="project-meta">
          <span class="language-badge">${project.data.primaryLanguage}</span>
          ${appTypeBadge}
          <span class="timestamp">${new Date(project.timestamp).toLocaleDateString()}</span>
        </div>
        <button class="view-project-btn" data-id="${project.id}">View</button>
      `;
      
      projectsList.appendChild(projectCard);
      
      // Add event listener to the view button
      projectCard.querySelector('.view-project-btn').addEventListener('click', () => {
        this.viewProject(project.id);
      });
    });
  }
  
  /**
   * Format app type for display
   */
  formatAppType(appType) {
    const appTypeMap = {
      'web': 'Web App',
      'mobile': 'Mobile App',
      'desktop': 'Desktop App',
      'api': 'API Service',
      'game': 'Game',
      'ai': 'AI/ML App',
      'iot': 'IoT App'
    };
    
    return appTypeMap[appType] || appType;
  }

  /**
   * View a specific project
   */
  viewProject(id) {
    const project = this.projects.find(p => p.id === id);
    if (!project) return;
    
    this.currentProject = project;
    this.displayOutput(project);
    
    // Update URL to include project ID for sharing
    history.pushState({ id }, '', `?project=${id}`);
  }

  /**
   * Check URL for project ID and display if found
   */
  checkUrlForProject() {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    
    if (projectId) {
      this.viewProject(projectId);
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  new AppIdeaGenerator();
});