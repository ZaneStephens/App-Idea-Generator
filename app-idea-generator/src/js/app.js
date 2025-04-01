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
    this.currentFiles = new Map(); // Map to store all files for a project (main guide, code, style)
    this.currentFileType = 'buildGuide'; // Default: 'buildGuide', 'code', 'style'
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

    // ADDED: Language mapping system
    this.languageFileTypes = {
      'javascript': { code: 'js', style: 'css' },
      'typescript': { code: 'ts', style: 'css' },
      'python': { code: 'py', style: 'css' }, // Example: Python uses .py and potentially CSS for web frameworks
      'java': { code: 'java', style: 'css' }, // Example: Java uses .java and potentially CSS for web frameworks
      'csharp': { code: 'cs', style: 'css' }, // Example: C# uses .cs and potentially CSS for web frameworks
      'go': { code: 'go', style: 'css' },
      'rust': { code: 'rs', style: 'css' },
      'swift': { code: 'swift', style: 'css' }, // Style might be less relevant or use platform specifics
      'kotlin': { code: 'kt', style: 'css' },
      'php': { code: 'php', style: 'css' }
      // Add more languages and their typical file extensions as needed
    };

    // ADDED: Language display names
     this.languageDisplayNames = {
       'javascript': 'JavaScript', 'typescript': 'TypeScript', 'python': 'Python',
       'java': 'Java', 'csharp': 'C#', 'go': 'Go', 'rust': 'Rust', 'swift': 'Swift',
       'kotlin': 'Kotlin', 'php': 'PHP'
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

    // ADDED: Initialize button labels based on default/initial language selection
    this.updateFileButtonLabels();

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
      this.updateFileButtonLabels(); // ADDED: Update labels if language changes due to architecture filter
    });

    // Language selector change
    document.getElementById('primary-language').addEventListener('change', (e) => {
      this.updateFrameworksList(e.target.value);
      this.updateFileButtonLabels(); // ADDED: Update labels when language explicitly changes
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

    document.getElementById('delete-file-btn').addEventListener('click', () => this.deleteCurrentFile());

    // Tab buttons for feature suggestions
    document.querySelectorAll('.tab-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const tabId = e.target.getAttribute('data-tab');
        this.switchFeatureTab(tabId);
      });
    });

    // Output file selection (This seems unused currently, but listener is here)
    document.querySelectorAll('input[name="output-files"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateOutputFiles();
      });
    });

    // Additional file generation buttons
    // NOTE: IDs remain 'js-file-btn' and 'css-file-btn', but the handler maps them correctly.
    document.getElementById('js-file-btn').addEventListener('click', () => {
      // Pass 'code' to indicate the primary language code file
      this.handleAdditionalFileGeneration('code');
    });

    document.getElementById('css-file-btn').addEventListener('click', () => {
       // Pass 'style' to indicate the styling file
      this.handleAdditionalFileGeneration('style');
    });
  }

  // ADDED: Helper method to get language display name
  getLanguageDisplayName(languageCode) {
    return this.languageDisplayNames[languageCode] || languageCode.toUpperCase();
  }

  // ADDED: Update file generation button labels and tooltips
  updateFileButtonLabels() {
    const primaryLanguage = document.getElementById('primary-language').value;
    // Default to generic 'code'/'style' if language not selected or not in map
    const languageInfo = this.languageFileTypes[primaryLanguage] || { code: 'code', style: 'style' };
    const languageDisplayName = this.getLanguageDisplayName(primaryLanguage);

    const codeFileBtn = document.getElementById('js-file-btn'); // Keep ID for stability
    if (codeFileBtn) {
        codeFileBtn.querySelector('.file-icon').textContent = languageInfo.code.toUpperCase();
        codeFileBtn.title = `Generate ${languageDisplayName} Guide (${languageInfo.code.toUpperCase()})`;
    }

    const styleFileBtn = document.getElementById('css-file-btn'); // Keep ID for stability
     if (styleFileBtn) {
        styleFileBtn.querySelector('.file-icon').textContent = languageInfo.style.toUpperCase();
        styleFileBtn.title = `Generate Style Guide (${languageInfo.style.toUpperCase()})`;
     }
  }


  /**
   * Filter available languages based on selected architecture
   */
  filterLanguagesByArchitecture(architecture) {
    const primaryLanguageSelect = document.getElementById('primary-language');
    const currentLanguage = primaryLanguageSelect.value;
    const options = primaryLanguageSelect.options;

    // Reset all options first
    for (let i = 0; i < options.length; i++) {
      options[i].classList.remove('hidden');
      options[i].disabled = false;
    }

    if (!architecture || !this.architectureFilters[architecture]) {
      this.updateFrameworksList(currentLanguage); // Ensure frameworks update even if no filter applied
      return; // No filtering needed
    }

    // Get allowed languages for this architecture
    const allowedLanguages = this.architectureFilters[architecture];

    // Hide/disable options that don't match
    let languageChanged = false;
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
      languageChanged = true;
    }

    // Update frameworks list based on the (potentially changed) language
    this.updateFrameworksList(primaryLanguageSelect.value);
    if(languageChanged) {
        this.updateFileButtonLabels(); // Update button labels if language was reset
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

      // Show loading indicator
      document.getElementById('loading-overlay').classList.add('show');
      document.getElementById('loading-overlay').querySelector('p').textContent = 'Creating your surprise app idea...';

      // Collect minimal form data
      const ideaData = { appName, description };

      // Call API to generate full form data suggestions
      const result = await apiHandler.generateSurpriseIdea(ideaData);

      // Populate form fields with the surprise data
      this.populateFormWithSurpriseData(result);

      // ADDED: Update button labels after populating form
      this.updateFileButtonLabels();

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
      this.filterLanguagesByArchitecture(surpriseData.architecture); // Apply filter first
    }

    if (surpriseData.primaryLanguage) {
      // Ensure the language is valid for the selected architecture before setting
      const allowedLanguages = this.architectureFilters[surpriseData.architecture] || Object.keys(this.languageFileTypes);
      if (allowedLanguages.includes(surpriseData.primaryLanguage)) {
          document.getElementById('primary-language').value = surpriseData.primaryLanguage;
          this.updateFrameworksList(surpriseData.primaryLanguage); // Update frameworks for the chosen language
      } else {
          // Language suggested is not valid for architecture, clear it
           document.getElementById('primary-language').value = '';
           this.updateFrameworksList('');
      }
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
       // Reset selected/deferred features if surprise overwrites the field
       this.selectedFeatures = [];
       this.deferredFeatures = [];
       // Clear visual lists if they exist
       const coreList = document.getElementById('core-features-list');
       const deferredList = document.getElementById('deferred-features-list');
       if (coreList) coreList.innerHTML = '<p>Feature suggestions will appear here.</p>';
       if (deferredList) deferredList.innerHTML = '<div class="empty-features"><p>No features deferred yet.</p></div>';
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
    // Using data-name attribute for selection
    const checkTool = (toolName) => {
      const checkbox = document.querySelector(`input[name="vibe-tools"][data-name="${toolName}"]`);
      if (checkbox) checkbox.checked = true;
    }

    if (appType === 'web') {
      checkTool('VSCode');
      checkTool('GitHub');
      checkTool('Netlify/Vercel'); // Assuming 'Netlify' maps to this data-name
    } else if (appType === 'mobile') {
      checkTool('Figma');
      checkTool('Firebase');
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

    // Initialize frameworks selector with empty state or based on current selection
    const currentLanguage = document.getElementById('primary-language').value;
    this.filterLanguagesByArchitecture(document.getElementById('app-architecture').value); // Apply initial filter
    this.updateFrameworksList(currentLanguage || ''); // Update frameworks for initial language
  }


  /**
   * Update frameworks list based on selected language
   */
  updateFrameworksList(language) {
    const container = document.getElementById('frameworks-container');
    container.innerHTML = ''; // Clear previous checkboxes

    if (!language) return;

    // Get frameworks for the selected language
    const frameworks = frameworksData[language] || [];
    const languageDisplayName = this.getLanguageDisplayName(language);

    // Add frameworks specific to the selected language
    if (frameworks.length > 0) {
      const frameworksGroup = document.createElement('div');
      frameworksGroup.classList.add('framework-group');
      frameworksGroup.innerHTML = `<h4>${languageDisplayName} Frameworks/Libraries</h4>`;

      frameworks.forEach(framework => {
        const checkbox = this.createCheckboxItem(framework);
        frameworksGroup.appendChild(checkbox);
      });

      container.appendChild(frameworksGroup);
    }

    // Add databases section (always shown)
    const dbGroup = document.createElement('div');
    dbGroup.classList.add('framework-group');
    dbGroup.innerHTML = '<h4>Databases</h4>';

    databaseTechnologies.forEach(db => {
      const checkbox = this.createCheckboxItem(db);
      dbGroup.appendChild(checkbox);
    });

    container.appendChild(dbGroup);

    // Add cloud platforms section (always shown)
    const cloudGroup = document.createElement('div');
    cloudGroup.classList.add('framework-group');
    cloudGroup.innerHTML = '<h4>Cloud Platforms</h4>';

    cloudPlatforms.forEach(platform => {
      const checkbox = this.createCheckboxItem(platform);
      cloudGroup.appendChild(checkbox);
    });

    container.appendChild(cloudGroup);

    // Add common tools section (always shown)
    const toolsGroup = document.createElement('div');
    toolsGroup.classList.add('framework-group');
    toolsGroup.innerHTML = '<h4>Common Tools / Concepts</h4>'; // Changed title slightly

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

    // Use item.id for value, item.name for display and data-name
    div.innerHTML = `
      <label class="checkbox-container" title="${item.description || item.name}">
        <input type="checkbox" name="frameworks" value="${item.id}" data-name="${item.name}">
        <span class="checkmark"></span>
        <span class="checkbox-label">${item.name}</span>
        ${item.description ? `<span class="tooltip">${item.description}</span>` : ''}
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
        this.showNotification('Please fill in Application Name, Description, and Primary Language to get relevant feature suggestions.', 'warning');
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

      // Reset selection states before displaying new suggestions
      this.selectedFeatures = [];
      this.deferredFeatures = [];
       // Clear visual lists
       document.getElementById('core-features-list').innerHTML = '';
       document.getElementById('deferred-features-list').innerHTML = '<div class="empty-features"><p>No features deferred yet.</p></div>';
       this.updateFeaturesInput(); // Clear the main features textarea


      // Display the suggestions
      this.displayFeatureSuggestions();

      // Show the feature suggestions container and switch to the first tab
      document.getElementById('feature-suggestions-container').classList.add('show');
      this.switchFeatureTab('core-features'); // Show core features tab by default

    } catch (error) {
      this.showNotification(`Error generating features: ${error.message}`, 'error');
    } finally {
      // Hide loading indicator
      document.getElementById('loading-overlay').classList.remove('show');
    }
  }


  /**
   * Get selected frameworks and vibe tools
   */
  getSelectedFrameworks() {
    const frameworkCheckboxes = document.querySelectorAll('input[name="frameworks"]:checked');
    const frameworks = Array.from(frameworkCheckboxes).map(checkbox => checkbox.getAttribute('data-name'));

    // Assuming 'vibe-tools' checkboxes also exist and should be included
    const vibeToolsCheckboxes = document.querySelectorAll('input[name="vibe-tools"]:checked');
    const vibeTools = Array.from(vibeToolsCheckboxes).map(checkbox => checkbox.getAttribute('data-name'));

    return [...frameworks, ...vibeTools];
  }

  /**
   * Display generated feature suggestions
   */
  displayFeatureSuggestions() {
    const coreFeaturesList = document.getElementById('core-features-list');
    coreFeaturesList.innerHTML = ''; // Clear previous

    if (!this.suggestedFeatures || this.suggestedFeatures.length === 0) {
      coreFeaturesList.innerHTML = `
        <div class="empty-features">
          <p>No features were suggested. Try modifying your application details or try again.</p>
        </div>
      `;
      return;
    }

    // Add each feature as a selectable item
    this.suggestedFeatures.forEach(feature => {
        // Ensure feature has a unique ID, generate one if missing (though API should provide it)
        if (!feature.id) feature.id = `gen_${Math.random().toString(36).substr(2, 9)}`;

      const featureItem = document.createElement('div');
      featureItem.classList.add('feature-item');
      featureItem.dataset.id = feature.id;

      featureItem.innerHTML = `
        <div class="feature-checkbox">
          <input type="checkbox" id="feature-${feature.id}" class="feature-select" title="Select as core feature">
        </div>
        <div class="feature-text">
          <strong>${feature.name || 'Unnamed Feature'}</strong><br>
          ${feature.description || 'No description.'}
        </div>
        <div class="feature-actions">
          <button class="feature-action-btn defer-btn" title="Defer feature (Save for later)">
            <span class="material-icons">schedule</span>
          </button>
          <button class="feature-action-btn remove-btn" title="Remove this suggestion">
            <span class="material-icons">close</span>
          </button>
        </div>
      `;

      coreFeaturesList.appendChild(featureItem);

      // Add event listeners
      const checkbox = featureItem.querySelector('.feature-select');
      checkbox.addEventListener('change', () => {
          const featureData = this.suggestedFeatures.find(f => f.id === feature.id);
          if (!featureData) return;

          if (checkbox.checked) {
              if (!this.selectedFeatures.some(f => f.id === feature.id)) {
                  this.selectedFeatures.push(featureData);
              }
          } else {
              this.selectedFeatures = this.selectedFeatures.filter(f => f.id !== feature.id);
          }
          this.updateFeaturesInput();
      });

      const deferButton = featureItem.querySelector('.defer-btn');
      deferButton.addEventListener('click', () => {
          const featureData = this.suggestedFeatures.find(f => f.id === feature.id);
           if (featureData) {
              // Remove from suggested list visually and internally
              this.suggestedFeatures = this.suggestedFeatures.filter(f => f.id !== feature.id);
              featureItem.remove();
              // Add to deferred list
              this.deferFeature(featureData);
               // Ensure it's removed from selected if it was checked
               this.selectedFeatures = this.selectedFeatures.filter(f => f.id !== feature.id);
               this.updateFeaturesInput();
           }
      });

      const removeButton = featureItem.querySelector('.remove-btn');
      removeButton.addEventListener('click', () => {
          // Remove from suggested list visually and internally
          this.suggestedFeatures = this.suggestedFeatures.filter(f => f.id !== feature.id);
           featureItem.remove();
           // Ensure it's removed from selected if it was checked
           this.selectedFeatures = this.selectedFeatures.filter(f => f.id !== feature.id);
           this.updateFeaturesInput();
      });
    });
     // Update empty state message if needed after potential removals
     if (coreFeaturesList.children.length === 0) {
         coreFeaturesList.innerHTML = `
             <div class="empty-features">
                 <p>All suggestions have been moved or removed.</p>
             </div>
         `;
     }
  }

  /**
   * Defer a feature for later implementation
   */
  deferFeature(feature) {
    // Add to deferred features array if not already there
     if (!this.deferredFeatures.some(f => f.id === feature.id)) {
        this.deferredFeatures.push(feature);
     }

    // Add to the deferred features list visually
    const deferredList = document.getElementById('deferred-features-list');

    // Clear empty state if needed
    const emptyState = deferredList.querySelector('.empty-features');
    if (emptyState) {
      deferredList.innerHTML = '';
    }

    const featureItem = document.createElement('div');
    featureItem.classList.add('feature-item');
    featureItem.dataset.id = feature.id;

    featureItem.innerHTML = `
      <div class="feature-text">
        <strong>${feature.name || 'Unnamed Feature'}</strong><br>
        ${feature.description || 'No description.'}
      </div>
      <div class="feature-actions">
        <button class="feature-action-btn restore-btn" title="Restore to Suggestions">
          <span class="material-icons">restore</span>
        </button>
        <button class="feature-action-btn remove-btn" title="Remove deferred feature permanently">
          <span class="material-icons">delete_forever</span>
        </button>
      </div>
    `;

    deferredList.appendChild(featureItem);

    // Add event listeners
    const restoreButton = featureItem.querySelector('.restore-btn');
    restoreButton.addEventListener('click', () => {
      // Remove from deferred array
      this.deferredFeatures = this.deferredFeatures.filter(f => f.id !== feature.id);
      // Remove visual item
      featureItem.remove();
      // Add back to suggestions array (if not already there)
      if (!this.suggestedFeatures.some(f => f.id === feature.id)) {
          this.suggestedFeatures.push(feature);
      }
      // Re-render the suggestions list to include it
      this.displayFeatureSuggestions();
      // Update features input (as selected features might change indirectly)
      this.updateFeaturesInput();
       // Update empty state for deferred list if needed
       if (deferredList.children.length === 0) {
         deferredList.innerHTML = '<div class="empty-features"><p>No features deferred yet.</p></div>';
       }
    });

    const removeButton = featureItem.querySelector('.remove-btn');
    removeButton.addEventListener('click', () => {
      // Remove from deferred array
      this.deferredFeatures = this.deferredFeatures.filter(f => f.id !== feature.id);
      // Remove visual item
      featureItem.remove();
      // Update features input (deferred features changed)
      this.updateFeaturesInput();
       // Update empty state for deferred list if needed
       if (deferredList.children.length === 0) {
         deferredList.innerHTML = '<div class="empty-features"><p>No features deferred yet.</p></div>';
       }
    });

    // Update features input to reflect deferred features list (though it mainly shows selected)
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

    // Show the selected tab content
    const contentEl = document.getElementById(tabId);
    if (contentEl) contentEl.classList.add('active');

    // Set the corresponding button as active
    const buttonEl = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
     if (buttonEl) buttonEl.classList.add('active');
  }

  /**
   * Update features input field with selected features for the main form
   */
  updateFeaturesInput() {
    const featuresInput = document.getElementById('features');
    let featuresText = '';

    if (this.selectedFeatures.length > 0) {
      featuresText = "Selected Core Features:\n" + this.selectedFeatures.map((feature, index) =>
        `${index + 1}. ${feature.name}: ${feature.description}`
      ).join('\n');
    } else {
        featuresText = "No core features selected. Use 'Suggest Features' or type manually.";
    }

    // Optionally, include deferred features in the text area as well (read-only)
     if (this.deferredFeatures.length > 0) {
         featuresText += "\n\nDeferred Features (for later):\n" + this.deferredFeatures.map((feature, index) =>
             `${index + 1}. ${feature.name}: ${feature.description}`
         ).join('\n');
     }


    featuresInput.value = featuresText;
  }

  /**
   * Update output file selections (Placeholder - seems unused)
   */
  updateOutputFiles() {
    // This method seems unused based on current logic.
    // If intended for use, implement based on 'output-files' checkboxes.
    console.warn("updateOutputFiles called but seems unimplemented.");
    // Example:
    // const outputFiles = Array.from(document.querySelectorAll('input[name="output-files"]:checked'))
    //   .map(checkbox => ({
    //     type: checkbox.value,
    //     name: checkbox.getAttribute('data-name')
    //   }));
    // this.outputFiles = outputFiles;
  }

  /**
   * Handle generating additional documentation files (Code/Style)
   * // CHANGED: Accepts 'code' or 'style' as fileType
   */
  async handleAdditionalFileGeneration(fileType /* 'code' or 'style' */) {
    if (!this.currentProject) {
      this.showNotification('Please generate or select a project first.', 'warning');
      return;
    }

     // Get language info from the *current loaded project*
     const primaryLanguage = this.currentProject.data.primaryLanguage;
     if (!primaryLanguage) {
         this.showNotification('Project is missing primary language information.', 'error');
         return;
     }
     const languageInfo = this.languageFileTypes[primaryLanguage] || { code: '?', style: '?' };
     const languageName = this.getLanguageDisplayName(primaryLanguage);
     const fileExtension = (fileType === 'code' ? languageInfo.code : languageInfo.style);
     const fileTypeName = (fileType === 'code' ? `${languageName} (${fileExtension.toUpperCase()})` : `Style (${fileExtension.toUpperCase()})`);


    // Check if this file already exists using the generic type ('code' or 'style')
    if (this.currentFiles.has(fileType)) {
      this.showNotification(`${fileTypeName} guide already exists. Switching to it.`, 'info');
      this.switchToFile(fileType);
      return;
    }

    try {
      // Show loading indicator
      document.getElementById('loading-overlay').classList.add('show');
      document.getElementById('loading-overlay').querySelector('p').textContent =
        `Generating ${fileTypeName} guide...`;

      // Add file type and extension to data for the API call
      // Ensure associatedFiles from the current project are passed correctly for context
      const projectDataForApi = {
          ...this.currentProject, // Includes id, title, content (build guide), timestamp
          data: { // Pass relevant form data, including language specifics
              ...this.currentProject.data,
              fileType: fileType, // Pass 'code' or 'style'
              fileExtension: fileExtension // Pass the specific extension (e.g., 'py', 'ts', 'css')
          },
           // Pass existing files for context (API handler will check this)
           associatedFiles: Array.from(this.currentFiles.values()).filter(f => f.fileType !== 'buildGuide')
      };


      // Generate the file using the API handler, passing the generic type 'code' or 'style'
      const fileData = await apiHandler.generateAdditionalFile(projectDataForApi, fileType);
        // fileData should have { title, content, timestamp, fileType: 'code'|'style', parentId }


      // Add to the current files map using the generic type
      this.currentFiles.set(fileType, fileData);

      // Update project storage (add to associatedFiles)
      this.addFileToProject(this.currentProject.id, fileData); // fileData now has fileType 'code' or 'style'

      // Recreate tabs to include the new file
      this.createFileTabs();

      // Switch to the newly generated file
      this.switchToFile(fileType);


      this.showNotification(`${fileTypeName} guide generated successfully!`, 'success');
    } catch (error) {
      this.showNotification(`Error generating ${fileTypeName} guide: ${error.message}`, 'error');
      console.error(`Error generating ${fileType} file:`, error);
    } finally {
      // Hide loading indicator
      document.getElementById('loading-overlay').classList.remove('show');
    }
  }


  /**
   * Create file tabs for navigation between different documentation files
   * // CHANGED: Uses generic types 'code'/'style' and dynamic names
   */
  createFileTabs() {
    const fileTabs = document.getElementById('file-tabs');
    fileTabs.innerHTML = ''; // Clear existing tabs

    // Only show tabs if we have more than one file type available
    if (!this.currentFiles || this.currentFiles.size <= 1) {
      fileTabs.style.display = 'none';
      return;
    }

    fileTabs.style.display = 'flex'; // Show the tab container

    // Determine language name for the code tab (if project is loaded)
    let languageName = 'Code'; // Default
    let codeFileExtension = 'code';
    let styleFileExtension = 'style';
     if (this.currentProject && this.currentProject.data.primaryLanguage) {
         const langCode = this.currentProject.data.primaryLanguage;
         const langInfo = this.languageFileTypes[langCode] || { code: 'code', style: 'style'};
         languageName = this.getLanguageDisplayName(langCode);
         codeFileExtension = langInfo.code;
         styleFileExtension = langInfo.style;
     }


    // Order: Build Guide, Code Guide, Style Guide
    const tabOrder = ['buildGuide', 'code', 'style'];

    tabOrder.forEach(fileTypeKey => {
        if (this.currentFiles.has(fileTypeKey)) {
            const tab = document.createElement('button');
            tab.classList.add('file-tab');
            tab.dataset.fileType = fileTypeKey; // Use 'buildGuide', 'code', 'style'

            let tabText = '';
             switch (fileTypeKey) {
                 case 'buildGuide':
                     tabText = 'Build Guide';
                     break;
                 case 'code':
                     tabText = `${languageName} (${codeFileExtension.toUpperCase()})`;
                     break;
                 case 'style':
                      tabText = `Style (${styleFileExtension.toUpperCase()})`;
                     break;
             }
             tab.textContent = tabText;


            if (this.currentFileType === fileTypeKey) {
              tab.classList.add('active');
            }

            tab.addEventListener('click', (e) => {
              const type = e.target.dataset.fileType;
              this.switchToFile(type);
            });

            fileTabs.appendChild(tab);
        }
    });
  }


/**
 * Switch between different files of a project
 * // CHANGED: Handles 'buildGuide', 'code', 'style' file types
 */
switchToFile(fileType) {
    if (!this.currentFiles || !this.currentFiles.has(fileType)) {
        console.warn(`Attempted to switch to non-existent file type: ${fileType}`);
        // Optionally switch to a default like 'buildGuide' if current is invalid
        if (!this.currentFiles.has(this.currentFileType)) {
            this.currentFileType = 'buildGuide';
            if (!this.currentFiles.has(this.currentFileType)) return; // No files left
        } else {
             return; // Stay on current valid file
        }
         // Re-assign fileType if we fell back to default
         fileType = this.currentFileType;
    }

    // Update current file type state
    this.currentFileType = fileType;

    // Get the file data from the map
    const fileData = this.currentFiles.get(fileType);
    if (!fileData) {
        console.error(`File data not found for type: ${fileType}`);
        // Potentially clear the display or show an error
        document.getElementById('output-title').textContent = "Error: File Not Found";
        document.getElementById('markdown-output').innerHTML = "";
        return;
    }

    // Update the output title
    const outputTitle = document.getElementById('output-title');
     // Use the file's specific title if available, otherwise use project title for build guide
     outputTitle.textContent = fileData.title || (fileType === 'buildGuide' ? this.currentProject?.title : 'Untitled Guide');


    // Update the content (ensure marked and DOMPurify are available)
    try {
        const markdownOutput = document.getElementById('markdown-output');
        const html = DOMPurify.sanitize(marked.parse(fileData.content || ''));
        markdownOutput.innerHTML = html;
    } catch (e) {
        console.error("Error parsing markdown or sanitizing:", e);
        document.getElementById('markdown-output').innerHTML = "<p>Error displaying content.</p>";
    }


    // Update active tab state
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
      // Can delete 'code' and 'style' guides
      deleteFileBtn.style.display = 'flex'; // Or 'inline-flex' depending on your CSS
    }
  }

  /**
   * Delete the current file (Code or Style guide)
   * // CHANGED: Works with 'code'/'style' types
   */
  deleteCurrentFile() {
    // Can't delete the main build guide
    if (this.currentFileType === 'buildGuide') {
      this.showNotification('Cannot delete the main Build Guide.', 'warning');
      return;
    }

    if (!this.currentProject || !this.currentProject.id || !this.currentFileType) {
      this.showNotification('No project or file selected to delete.', 'error');
      return;
    }

     // Get the name for confirmation message
     let fileTypeName = this.currentFileType.toUpperCase();
     const currentFile = this.currentFiles.get(this.currentFileType);
     if (currentFile && currentFile.title) {
         // Extract type part from title like "Project - Python Guide" -> "Python Guide"
         fileTypeName = currentFile.title.split(' - ').pop() || fileTypeName;
     }


    // Ask for confirmation
    if (!confirm(`Are you sure you want to delete the ${fileTypeName}? This cannot be undone.`)) {
      return;
    }

    const fileTypeToDelete = this.currentFileType; // Store before switching

    // Find the project index in the main projects array
    const projectIndex = this.projects.findIndex(p => p.id === this.currentProject.id);
    if (projectIndex === -1) {
        console.error("Current project not found in projects list for deletion.");
        this.showNotification('Error finding project data.', 'error');
        return;
    }

    // Remove file from the project's associatedFiles in the main list
    if (this.projects[projectIndex].associatedFiles) {
      this.projects[projectIndex].associatedFiles = this.projects[projectIndex].associatedFiles.filter(
        file => file.fileType !== fileTypeToDelete // Filter using 'code' or 'style'
      );

      // Update localStorage immediately
      localStorage.setItem('appIdeaProjects', JSON.stringify(this.projects));
      // Also update the currentProject object in memory to reflect the change
      this.currentProject.associatedFiles = this.projects[projectIndex].associatedFiles;
    }

    // Remove from current in-memory files map
    this.currentFiles.delete(fileTypeToDelete);

    // Switch back to build guide (or the next available tab)
    this.switchToFile('buildGuide'); // switchToFile handles falling back if buildGuide is missing

    // Recreate file tabs to reflect the deletion
    this.createFileTabs();

    this.showNotification(`${fileTypeName} deleted successfully.`, 'success');
  }


  /**
   * Add a file to a project's associated files in the main projects list
   * // CHANGED: Expects fileData with fileType 'code' or 'style'
   */
  addFileToProject(projectId, fileData) {
    const projectIndex = this.projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
        console.error("Project not found for adding file:", projectId);
        return;
    }

    // Ensure the file data has the correct generic fileType ('code' or 'style')
     if (fileData.fileType !== 'code' && fileData.fileType !== 'style') {
         console.error("Attempted to add file with invalid type:", fileData.fileType);
         // Maybe try to map legacy types? For now, we assume generateAdditionalFile returns correct type.
         // fileData.fileType = fileData.fileType === 'js' ? 'code' : (fileData.fileType === 'css' ? 'style' : fileData.fileType);
         // If still invalid, return or throw error
         if (fileData.fileType !== 'code' && fileData.fileType !== 'style') {
              this.showNotification('Internal error: Could not save file with unknown type.', 'error');
              return;
         }
     }


    // Initialize associatedFiles array if it doesn't exist
    if (!this.projects[projectIndex].associatedFiles) {
      this.projects[projectIndex].associatedFiles = [];
    }

    // Avoid duplicates - remove existing file of the same type before adding new
     this.projects[projectIndex].associatedFiles = this.projects[projectIndex].associatedFiles.filter(
         f => f.fileType !== fileData.fileType
     );


    // Add the new file data
    this.projects[projectIndex].associatedFiles.push(fileData);

    // Update the currentProject object in memory as well
    if (this.currentProject && this.currentProject.id === projectId) {
        this.currentProject.associatedFiles = this.projects[projectIndex].associatedFiles;
    }


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

    // Get selected frameworks and tools
    const allTools = this.getSelectedFrameworks(); // Uses helper function

    const features = document.getElementById('features').value; // This now reflects selected/deferred
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
      frameworks: allTools, // Includes frameworks and tools
      features, // The raw text (could be removed if selected/deferred is sufficient)
      targetAudience,
      selectedFeatures: this.selectedFeatures, // Pass the structured selected features
      deferredFeatures: this.deferredFeatures // Pass the structured deferred features
    };

    // Check if this is an AI application or uses AI API calls
    if (appType === 'ai' || allTools.includes('AI API calls')) {
      // Include current AI model information to help with knowledge cutoff
      data.aiModelInfo = {
        lastUpdated: 'April 1, 2025', // TODO: Make this dynamic?
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
      document.getElementById('loading-overlay').querySelector('p').textContent = 'Generating Build Guide...';

      // Gather form data
      const ideaData = this.collectFormData();

       // Basic validation
       if (!ideaData.appName || !ideaData.primaryLanguage) {
           this.showNotification('Please provide at least an App Name and select a Primary Language.', 'warning');
           document.getElementById('loading-overlay').classList.remove('show');
           return;
       }

      // Generate initial build guide using API
      const result = await apiHandler.generateBuildGuide(ideaData);
      // result = { title, content, timestamp }

      // Store the current project
      const newProjectId = Date.now().toString();
      this.currentProject = {
        id: newProjectId,
        title: result.title, // From API response
        content: result.content, // Build guide content
        timestamp: result.timestamp, // From API response
        data: ideaData, // Form data snapshot
        associatedFiles: [] // Initialize associated files
      };

      // Reset current in-memory files map and set the build guide
      this.currentFiles = new Map();
      this.currentFiles.set('buildGuide', {
        content: result.content,
        title: result.title,
        fileType: 'buildGuide',
         // Add parentId here too for consistency, though less critical for build guide itself
         parentId: newProjectId,
         timestamp: result.timestamp
      });
      this.currentFileType = 'buildGuide'; // Set current view to build guide

      // Save the new project (including the build guide content)
      this.saveProject(this.currentProject);

      // Display the result (which now handles setting up tabs correctly)
      this.displayOutput(this.currentProject);

      // Update the sidebar projects list
      this.renderProjectsList();

      // Update URL
      history.pushState({ id: newProjectId }, '', `?project=${newProjectId}`);

    } catch (error) {
      this.showNotification(`Error generating project: ${error.message}`, 'error');
      console.error("Form submission error:", error);
    } finally {
      // Hide loading indicator
      document.getElementById('loading-overlay').classList.remove('show');
    }
  }


  /**
   * Display project output (main guide and any associated files)
   * // CHANGED: Handles mapping legacy 'js'/'css' to 'code'/'style' during loading
   */
  displayOutput(project) {
    if (!project) {
        this.hideOutput();
        return;
    }
    this.currentProject = project; // Ensure current project is set

    // Set output title initially to the main project title
    document.getElementById('output-title').textContent = project.title;

    // Reset file map and add the main build guide
    this.currentFiles = new Map();
    this.currentFiles.set('buildGuide', {
      content: project.content,
      title: project.title,
      fileType: 'buildGuide',
      parentId: project.id,
      timestamp: project.timestamp
    });

    // Add associated files, mapping legacy types if necessary
    if (project.associatedFiles && Array.isArray(project.associatedFiles)) {
      project.associatedFiles.forEach(file => {
        let fileTypeKey = file.fileType;
        // Map legacy keys
        if (fileTypeKey === 'js') fileTypeKey = 'code';
        if (fileTypeKey === 'css') fileTypeKey = 'style';

        // Only add if it's a recognized type ('code' or 'style')
        if (fileTypeKey === 'code' || fileTypeKey === 'style') {
             // Ensure the file object itself also uses the new key internally if mapped
             const fileDataToAdd = {...file, fileType: fileTypeKey};
             this.currentFiles.set(fileTypeKey, fileDataToAdd);
        } else {
            console.warn("Skipping associated file with unrecognized type:", file);
        }
      });
    }

    // Set the initial view to the build guide
    this.currentFileType = 'buildGuide';

    // Create file tabs based on the populated `this.currentFiles` map
    this.createFileTabs();

    // Switch to the initial file (buildGuide), which renders its content
    this.switchToFile('buildGuide');

    // Show output container
    document.getElementById('output-container').classList.add('show');

    // Scroll to the output (optional)
    // document.getElementById('output-container').scrollIntoView({ behavior: 'smooth' });

    // ADDED: Update file generation button labels based on the loaded project's language
    if (project.data && project.data.primaryLanguage) {
        // Temporarily set the form's language dropdown to match the project
        // to ensure button labels update correctly, then restore original value if needed.
        const langDropdown = document.getElementById('primary-language');
        const originalLang = langDropdown.value;
        langDropdown.value = project.data.primaryLanguage;
        this.updateFileButtonLabels();
        // Restore if needed, though viewing a project might imply form should reflect it?
        // langDropdown.value = originalLang;
    } else {
        // If project has no language, update buttons based on current form selection
         this.updateFileButtonLabels();
    }

  }

    // ADDED: Helper method to get proper file type name for notifications/downloads
    getFileTypeName(fileType = this.currentFileType) {
        const currentFile = this.currentFiles.get(fileType);

        if (fileType === 'buildGuide') return 'Build Guide';
        if (fileType === 'code') {
            // Try to get specific name from file title or project data
            if (currentFile?.title) return currentFile.title.split(' - ').pop() || 'Code Guide';
            if (this.currentProject?.data?.primaryLanguage) return `${this.getLanguageDisplayName(this.currentProject.data.primaryLanguage)} Guide`;
            return 'Code Guide';
        }
         if (fileType === 'style') {
             if (currentFile?.title) return currentFile.title.split(' - ').pop() || 'Style Guide';
             return 'Style Guide';
         }
         return 'Guide'; // Fallback
    }


  /**
   * Copy output of the *currently viewed* file to clipboard
   * // CHANGED: Uses currentFiles and currentFileType
   */
  copyOutputToClipboard() {
    if (!this.currentProject || !this.currentFiles.has(this.currentFileType)) {
        this.showNotification('No content selected to copy.', 'warning');
        return;
    }

    // Get the content of the currently active file
    const currentFile = this.currentFiles.get(this.currentFileType);
    if (!currentFile || typeof currentFile.content !== 'string') {
        this.showNotification('Cannot copy empty or invalid content.', 'error');
        return;
    }

    navigator.clipboard.writeText(currentFile.content)
      .then(() => {
        // CHANGED: Use helper for dynamic name
        this.showNotification(`${this.getFileTypeName()} copied to clipboard!`, 'success');
      })
      .catch(err => {
        this.showNotification('Failed to copy to clipboard. See console for details.', 'error');
        console.error('Could not copy text: ', err);
      });
  }

  /**
   * Download output of the *currently viewed* file as markdown
   * // CHANGED: Uses currentFiles, currentFileType, and dynamic filenames
   */
  downloadAsMarkdown() {
     if (!this.currentProject || !this.currentFiles.has(this.currentFileType)) {
         this.showNotification('No content selected to download.', 'warning');
         return;
     }

     // Get the content and info of the currently active file
     const currentFile = this.currentFiles.get(this.currentFileType);
      if (!currentFile || typeof currentFile.content !== 'string') {
          this.showNotification('Cannot download empty or invalid content.', 'error');
          return;
      }

     const appName = this.currentProject.title || 'app_idea';
     const safeAppName = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
     let fileName;

     // Create appropriate filename based on the current file type
     if (this.currentFileType === 'buildGuide') {
       fileName = `${safeAppName}_build_guide.md`; // Make main guide distinct too
     } else if (this.currentFileType === 'code') {
         // Use language extension from project data if possible
         const langCode = this.currentProject?.data?.primaryLanguage;
         const langInfo = langCode ? (this.languageFileTypes[langCode] || { code: 'code'}) : { code: 'code'};
         const fileExt = langInfo.code;
         fileName = `${safeAppName}_${fileExt}.md`;
     } else if (this.currentFileType === 'style') {
          // Use style extension from project data if possible
         const langCode = this.currentProject?.data?.primaryLanguage;
         const langInfo = langCode ? (this.languageFileTypes[langCode] || { style: 'style'}) : { style: 'style'};
         const fileExt = langInfo.style;
         fileName = `${safeAppName}_${fileExt}.md`;
     } else {
         // Fallback for unknown types
         fileName = `${safeAppName}_${this.currentFileType}.md`;
     }


     const blob = new Blob([currentFile.content], { type: 'text/markdown;charset=utf-8' });

     const link = document.createElement('a');
     link.href = URL.createObjectURL(blob);
     link.download = fileName;

     // Append to the document, click and remove
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);

     // CHANGED: Use helper for dynamic name
     this.showNotification(`${this.getFileTypeName()} downloaded as ${fileName}!`, 'success');
   }

  /**
   * Hide output container
   */
  hideOutput() {
    document.getElementById('output-container').classList.remove('show');
    this.currentProject = null; // Clear current project when hiding output
    this.currentFiles = new Map();
    this.currentFileType = 'buildGuide';
     // Clear URL parameter when closing
     history.pushState(null, '', window.location.pathname);
     // Reset button labels based on current form state
     this.updateFileButtonLabels();
  }

  /**
   * Save project to localStorage
   */
  saveProject(project) {
    // Ensure project exists before trying to save
     const existingIndex = this.projects.findIndex(p => p.id === project.id);
     if (existingIndex > -1) {
         // Update existing project
         this.projects[existingIndex] = project;
     } else {
         // Add new project
         this.projects.push(project);
     }
    localStorage.setItem('appIdeaProjects', JSON.stringify(this.projects));
  }

  /**
   * Load projects from localStorage
   */
  loadProjects() {
    try {
      const projectsJson = localStorage.getItem('appIdeaProjects');
      const loadedProjects = projectsJson ? JSON.parse(projectsJson) : [];
       // Basic validation or migration could happen here if needed
       if (!Array.isArray(loadedProjects)) {
           console.error("Loaded projects data is not an array. Resetting.");
           return [];
       }
       // Ensure essential fields exist
        return loadedProjects.map(p => ({
            id: p.id || Date.now().toString() + Math.random(), // Ensure ID exists
            title: p.title || "Untitled Project",
            content: p.content || "", // Build guide content
            timestamp: p.timestamp || new Date().toISOString(),
            data: p.data || {}, // Form data snapshot
            associatedFiles: Array.isArray(p.associatedFiles) ? p.associatedFiles : []
        }));

    } catch (error) {
      console.error('Error loading projects from localStorage:', error);
      localStorage.removeItem('appIdeaProjects'); // Clear corrupted data
      return [];
    }
  }

  /**
   * Render projects list in the sidebar
   */
  renderProjectsList() {
    const projectsList = document.getElementById('projects-list');
    projectsList.innerHTML = ''; // Clear previous list

    if (!this.projects || this.projects.length === 0) {
      projectsList.innerHTML = `
        <div class="empty-state">
          <p>No saved projects yet. Generate your first app idea!</p>
        </div>
      `;
      return;
    }

    // Sort projects by timestamp (newest first)
    const sortedProjects = [...this.projects].sort((a, b) => {
      // Ensure timestamps are valid Date objects for comparison
       const dateA = new Date(a.timestamp || 0);
       const dateB = new Date(b.timestamp || 0);
       return dateB - dateA;
    });

    sortedProjects.forEach(project => {
      const projectCard = document.createElement('div');
      projectCard.classList.add('project-card');
       // Highlight the currently viewed project
       if (this.currentProject && this.currentProject.id === project.id) {
           projectCard.classList.add('active');
       }


      // Add app type badge if available (using data from the project)
      const appTypeBadge = project.data?.appType
        ? `<span class="app-type-badge" title="App Type: ${this.formatAppType(project.data.appType)}">${this.formatAppType(project.data.appType)}</span>`
        : '';

      // Add language badge if available
       const langBadge = project.data?.primaryLanguage
         ? `<span class="language-badge" title="Language: ${this.getLanguageDisplayName(project.data.primaryLanguage)}">${this.getLanguageDisplayName(project.data.primaryLanguage)}</span>`
         : '';

      // Truncate description safely
      const description = project.data?.description || 'No description.';
      const truncatedDesc = description.length > 80 ? description.substring(0, 80) + '...' : description;

      // Format timestamp
      let displayDate = 'N/A';
       try {
           displayDate = new Date(project.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
       } catch (e) { console.warn("Invalid project timestamp:", project.timestamp); }

      projectCard.innerHTML = `
        <h3>${project.title || 'Untitled Project'}</h3>
        <p class="project-description" title="${description}">${truncatedDesc}</p>
        <div class="project-meta">
          ${langBadge}
          ${appTypeBadge}
          <span class="timestamp" title="Generated on ${new Date(project.timestamp).toLocaleString()}">${displayDate}</span>
        </div>
        <button class="view-project-btn" data-id="${project.id}" title="View Project Details">View</button>
        <button class="delete-project-btn" data-id="${project.id}" title="Delete Project Permanently">
             <span class="material-icons">delete_forever</span>
        </button>
      `;

      projectsList.appendChild(projectCard);

      // Add event listener to the view button
      projectCard.querySelector('.view-project-btn').addEventListener('click', (e) => {
        this.viewProject(e.currentTarget.dataset.id);
      });

       // Add event listener to the delete button
       projectCard.querySelector('.delete-project-btn').addEventListener('click', (e) => {
           e.stopPropagation(); // Prevent card click / view action
           this.deleteProject(e.currentTarget.dataset.id);
       });
    });
  }

    /**
    * Delete an entire project
    */
   deleteProject(id) {
       const projectToDelete = this.projects.find(p => p.id === id);
       if (!projectToDelete) return;

       if (confirm(`Are you sure you want to permanently delete the project "${projectToDelete.title}"? This cannot be undone.`)) {
           // Remove from projects array
           this.projects = this.projects.filter(p => p.id !== id);

           // Update localStorage
           localStorage.setItem('appIdeaProjects', JSON.stringify(this.projects));

           // If the deleted project was the currently viewed one, hide the output
           if (this.currentProject && this.currentProject.id === id) {
               this.hideOutput();
           }

           // Re-render the projects list
           this.renderProjectsList();

           this.showNotification(`Project "${projectToDelete.title}" deleted.`, 'success');
       }
   }

  /**
   * Format app type for display badges/tooltips
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

    return appTypeMap[appType] || appType; // Fallback to the raw type
  }

  /**
   * View a specific project by ID
   */
  viewProject(id) {
    const project = this.projects.find(p => p.id === id);
    if (!project) {
        this.showNotification(`Project with ID ${id} not found.`, 'error');
        return;
    }

    // Set as current project and display its content
    // displayOutput handles setting this.currentProject and loading files
    this.displayOutput(project);

    // Update URL to include project ID for sharing/bookmarking
    history.pushState({ id }, '', `?project=${id}`);

     // Re-render project list to highlight the active one
     this.renderProjectsList();
  }

  /**
   * Check URL on load for a project ID and display if found
   */
  checkUrlForProject() {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');

    if (projectId) {
      const projectExists = this.projects.some(p => p.id === projectId);
      if (projectExists) {
          this.viewProject(projectId);
      } else {
          this.showNotification(`Project ID "${projectId}" from URL not found. Showing form.`, 'warning');
          // Remove invalid parameter from URL
          history.replaceState(null, '', window.location.pathname);
      }
    }
  }

  /**
   * Show notification message
   */
  showNotification(message, type = 'info') { // Default type to 'info'
    const container = document.getElementById('notification-container');
     if (!container) { // Fallback if container doesn't exist
         console.log(`Notification (${type}): ${message}`);
         alert(`${type.toUpperCase()}: ${message}`);
         return;
     }

    const notification = document.createElement('div');
    notification.classList.add('notification', type); // type can be 'success', 'error', 'warning', 'info'
    notification.textContent = message;

     // Add a close button
     const closeButton = document.createElement('button');
     closeButton.innerHTML = '×'; // or use an icon
     closeButton.classList.add('close-btn');
     closeButton.onclick = () => {
         notification.classList.remove('show');
         // Remove from DOM after transition
         notification.addEventListener('transitionend', () => notification.remove());
     };
     notification.appendChild(closeButton);


    container.appendChild(notification);

    // Trigger the animation
    // Use requestAnimationFrame to ensure element is in DOM before adding class
     requestAnimationFrame(() => {
        setTimeout(() => notification.classList.add('show'), 10); // Small delay helps ensure transition triggers
     });


    // Auto-remove after a delay (e.g., 5 seconds)
     const autoCloseTimeout = setTimeout(() => {
         closeButton.click(); // Simulate click to trigger fade out and removal
     }, 5000);

     // Clear timeout if user closes manually
     closeButton.addEventListener('click', () => clearTimeout(autoCloseTimeout), { once: true });

  }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Ensure external libraries like 'marked' and 'DOMPurify' are loaded before initializing
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
      console.error("Error: 'marked' or 'DOMPurify' library not loaded. Cannot initialize app.");
       // Display an error to the user
       const body = document.querySelector('body');
       if(body) {
           body.innerHTML = '<h1 style="color: red; text-align: center; padding-top: 50px;">Initialization Error: Required libraries (marked, DOMPurify) are missing. Please check the console.</h1>';
       }
      return;
  }

  // Configure marked (optional, but good practice)
  marked.setOptions({
    breaks: true, // Convert GFM line breaks to <br>
    gfm: true, // Enable GitHub Flavored Markdown
    // Consider adding a syntax highlighter integration here if needed
  });


  // Initialize the application class
  window.appIdeaGenerator = new AppIdeaGenerator();
});