class PromptGenerator {
    constructor() {
        this.apiKey = localStorage.getItem('openrouter_api_key') || '';
        this.siteUrl = 'YOUR_SITE_URL';
        this.siteName = 'YOUR_SITE_NAME';
        this.init();
    }

    init() {
        // Initialize theme
        this.initializeTheme();
        
        // Initialize API key input
        this.initializeApiKey();

        // Add event listeners
        document.getElementById('generate-btn').addEventListener('click', () => this.generatePrompt());
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.copyToClipboard(e.target.dataset.target));
        });
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.loadTemplate(e.target.dataset.template));
        });
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.sharePrompt(e.target.dataset.platform));
        });
    }

    initializeTheme() {
        const themeSwitch = document.getElementById('theme-switch');
        const savedTheme = localStorage.getItem('theme') || 'light';
        
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeSwitch.checked = savedTheme === 'dark';

        themeSwitch.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    initializeApiKey() {
        const apiKeyInput = document.getElementById('api-key');
        const saveButton = document.getElementById('save-api-key');
        
        // Set initial value if exists
        if (this.apiKey) {
            apiKeyInput.value = this.apiKey;
        }

        // Save API key when button is clicked
        saveButton.addEventListener('click', () => {
            const newApiKey = apiKeyInput.value.trim();
            if (newApiKey) {
                this.apiKey = newApiKey;
                localStorage.setItem('openrouter_api_key', newApiKey);
                alert('API key saved successfully!');
            } else {
                alert('Please enter a valid API key');
            }
        });
    }

    async generatePrompt() {
        if (!this.apiKey) {
            alert('Please enter your OpenRouter API key first');
            return;
        }

        const userPrompt = document.getElementById('user-prompt').value.trim();
        if (!userPrompt) {
            alert('Please enter an image description');
            return;
        }

        const enhancePrompt = document.getElementById('enhance-prompt').checked;
        const style = Array.from(document.getElementById('style').selectedOptions).map(option => option.value);
        const subject = document.getElementById('subject').value;
        const mood = document.getElementById('mood').value;
        const lighting = document.getElementById('lighting').value;

        const spinner = document.querySelector('.spinner');
        spinner.classList.remove('hidden');

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "HTTP-Referer": this.siteUrl,
                    "X-Title": this.siteName,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "google/learnlm-1.5-pro-experimental:free",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a Stable Diffusion prompt expert. Provide only the prompt text without any explanations or formatting. Split the response into two parts: positive prompt and negative prompt, separated by 'Negative:'."
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": `${enhancePrompt ? 'Enhance this prompt' : 'Format this prompt'} for Stable Diffusion 1.5:
                                    Base prompt: ${userPrompt}
                                    ${style.length ? `Style: ${style.join(', ')}` : ''}
                                    ${subject ? `Subject type: ${subject}` : ''}
                                    ${mood ? `Mood: ${mood}` : ''}
                                    ${lighting ? `Lighting: ${lighting}` : ''}
                                    
                                    ${enhancePrompt ? 'Add relevant artistic details, technical parameters, and quality boosters. Separate the response into Positive and Negative prompts.' : 'Format the prompt and provide basic negative prompts.'}
                                    `
                                }
                            ]
                        }
                    ]
                })
            });

            const data = await response.json();
            this.updatePrompts(data.choices[0].message.content);
        } catch (error) {
            console.error('Error generating prompt:', error);
            alert('Error generating prompt. Please try again.');
        } finally {
            spinner.classList.add('hidden');
        }
    }

    updatePrompts(content) {
        // Parse the API response and split into positive and negative prompts
        const [positivePrompts, negativePrompts] = this.parsePrompts(content);
        
        document.getElementById('positive-prompts').value = positivePrompts;
        document.getElementById('negative-prompts').value = negativePrompts;
    }

    parsePrompts(content) {
        let [positivePrompts, negativePrompts] = ['', ''];
        
        // Split into positive and negative prompts
        if (content.toLowerCase().includes('negative:')) {
            [positivePrompts, negativePrompts] = content.split(/negative:/i);
        } else {
            positivePrompts = content;
        }

        // Clean up to keep only the prompt text
        positivePrompts = positivePrompts
            .replace(/positive:?/i, '')
            .replace(/^[\s\n]*|[\s\n]*$/g, '');

        negativePrompts = negativePrompts
            ?.replace(/^[\s\n]*|[\s\n]*$/g, '')
            || 'nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry';

        return [positivePrompts, negativePrompts];
    }

    async copyToClipboard(targetId) {
        const text = document.getElementById(targetId).value;
        try {
            await navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    }

    loadTemplate(template) {
        const templates = {
            portrait: {
                style: ['realistic'],
                subject: 'portrait',
                mood: 'peaceful',
                lighting: 'studio'
            },
            landscape: {
                style: ['oil-painting'],
                subject: 'landscape',
                mood: 'dramatic',
                lighting: 'natural'
            },
            anime: {
                style: ['anime'],
                subject: 'portrait',
                mood: 'energetic',
                lighting: 'dramatic'
            }
        };

        const selectedTemplate = templates[template];
        if (selectedTemplate) {
            this.setFormValues(selectedTemplate);
        }
    }

    setFormValues(template) {
        const styleSelect = document.getElementById('style');
        Array.from(styleSelect.options).forEach(option => {
            option.selected = template.style.includes(option.value);
        });

        document.getElementById('subject').value = template.subject;
        document.getElementById('mood').value = template.mood;
        document.getElementById('lighting').value = template.lighting;
    }

    sharePrompt(platform) {
        const positivePrompts = document.getElementById('positive-prompts').value;
        const negativePrompts = document.getElementById('negative-prompts').value;
        const text = `Positive Prompts: ${positivePrompts}\nNegative Prompts: ${negativePrompts}`;
        
        const urls = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`
        };

        window.open(urls[platform], '_blank', 'width=600,height=400');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new PromptGenerator();
}); 