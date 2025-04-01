/**
 * Frameworks and tools data organized by programming language
 */

const frameworksData = {
  javascript: [
    { id: 'react', name: 'React', description: 'A JavaScript library for building user interfaces' },
    { id: 'vue', name: 'Vue.js', description: 'Progressive JavaScript framework for building UIs' },
    { id: 'angular', name: 'Angular', description: 'Platform for building mobile and desktop web applications' },
    { id: 'node', name: 'Node.js', description: 'JavaScript runtime built on Chrome\'s V8 JavaScript engine' },
    { id: 'express', name: 'Express.js', description: 'Fast, unopinionated, minimalist web framework for Node.js' },
    { id: 'next', name: 'Next.js', description: 'React framework with hybrid static & server rendering' },
    { id: 'gatsby', name: 'Gatsby', description: 'Static site generator built on React' },
    { id: 'electron', name: 'Electron', description: 'Framework for creating native applications with web technologies' },
    { id: 'jquery', name: 'jQuery', description: 'Fast, small, and feature-rich JavaScript library' },
    { id: 'svelte', name: 'Svelte', description: 'Compiler that converts your components into highly efficient imperative code' }
  ],
  
  typescript: [
    { id: 'react-ts', name: 'React with TypeScript', description: 'React using TypeScript for type safety' },
    { id: 'angular-ts', name: 'Angular (TypeScript native)', description: 'Angular framework which uses TypeScript by default' },
    { id: 'nest', name: 'NestJS', description: 'Progressive Node.js framework for building server-side applications' },
    { id: 'next-ts', name: 'Next.js with TypeScript', description: 'Next.js with TypeScript support' },
    { id: 'deno', name: 'Deno', description: 'A secure runtime for JavaScript and TypeScript' },
    { id: 'vue-ts', name: 'Vue with TypeScript', description: 'Vue.js with TypeScript support' },
    { id: 'ts-node', name: 'ts-node', description: 'TypeScript execution and REPL for Node.js' }
  ],
  
  python: [
    { id: 'django', name: 'Django', description: 'High-level Python web framework that encourages rapid development' },
    { id: 'flask', name: 'Flask', description: 'Lightweight WSGI web application framework' },
    { id: 'fastapi', name: 'FastAPI', description: 'Modern, fast web framework for building APIs' },
    { id: 'pytorch', name: 'PyTorch', description: 'Open source machine learning framework' },
    { id: 'tensorflow', name: 'TensorFlow', description: 'End-to-end open source platform for machine learning' },
    { id: 'pandas', name: 'Pandas', description: 'Data analysis and manipulation tool' },
    { id: 'numpy', name: 'NumPy', description: 'Fundamental package for scientific computing' },
    { id: 'matplotlib', name: 'Matplotlib', description: 'Comprehensive library for creating static, animated, and interactive visualizations' },
    { id: 'scikit', name: 'Scikit-learn', description: 'Machine learning library for Python' },
    { id: 'streamlit', name: 'Streamlit', description: 'Turn data scripts into shareable web apps in minutes' }
  ],
  
  java: [
    { id: 'spring', name: 'Spring', description: 'Application framework and inversion of control container' },
    { id: 'android', name: 'Android SDK', description: 'Software development kit for the Android mobile OS' },
    { id: 'hibernate', name: 'Hibernate', description: 'Object-relational mapping framework' },
    { id: 'quarkus', name: 'Quarkus', description: 'Kubernetes native Java stack tailored for OpenJDK HotSpot & GraalVM' },
    { id: 'micronaut', name: 'Micronaut', description: 'Modern, JVM-based, full-stack framework' }
  ],
  
  csharp: [
    { id: 'aspnet', name: 'ASP.NET Core', description: 'Cross-platform, high-performance web framework' },
    { id: 'unity', name: 'Unity', description: 'Cross-platform game engine' },
    { id: 'xamarin', name: 'Xamarin', description: 'Platform for building mobile apps' },
    { id: 'maui', name: '.NET MAUI', description: 'Cross-platform framework for creating native mobile and desktop apps' },
    { id: 'blazor', name: 'Blazor', description: 'Framework for building web applications with C#/Razor and HTML' }
  ],
  
  go: [
    { id: 'gin', name: 'Gin', description: 'HTTP web framework in Go' },
    { id: 'echo', name: 'Echo', description: 'High performance, minimalist web framework' },
    { id: 'fiber', name: 'Fiber', description: 'Express inspired web framework built on top of Fasthttp' },
    { id: 'gorilla', name: 'Gorilla', description: 'Web toolkit for the Go programming language' },
    { id: 'gorm', name: 'GORM', description: 'The fantastic ORM library for Go' }
  ],
  
  rust: [
    { id: 'actix', name: 'Actix Web', description: 'Powerful, pragmatic, and extremely fast web framework' },
    { id: 'rocket', name: 'Rocket', description: 'Web framework for Rust that makes it simple to write fast, secure web applications' },
    { id: 'yew', name: 'Yew', description: 'Modern Rust framework for creating multi-threaded front-end web apps' },
    { id: 'tokio', name: 'Tokio', description: 'Platform for writing asynchronous I/O backed applications' },
    { id: 'wasm', name: 'WebAssembly (wasm-bindgen)', description: 'Facilitating high-level interactions between Rust and JavaScript' }
  ],
  
  swift: [
    { id: 'uikit', name: 'UIKit', description: 'Framework for building interfaces in iOS and tvOS apps' },
    { id: 'swiftui', name: 'SwiftUI', description: 'Declarative framework for building UIs across Apple platforms' },
    { id: 'combine', name: 'Combine', description: 'Framework for handling asynchronous events' },
    { id: 'vapor', name: 'Vapor', description: 'Server-side Swift framework' },
    { id: 'swift-nio', name: 'SwiftNIO', description: 'Cross-platform asynchronous event-driven network application framework' }
  ],
  
  kotlin: [
    { id: 'kotlin-android', name: 'Kotlin for Android', description: 'Android app development using Kotlin' },
    { id: 'ktor', name: 'Ktor', description: 'Framework for building asynchronous servers and clients' },
    { id: 'spring-kotlin', name: 'Spring with Kotlin', description: 'Spring framework with Kotlin support' },
    { id: 'compose', name: 'Jetpack Compose', description: 'Modern UI toolkit for Android' },
    { id: 'kotlinx', name: 'KotlinX libraries', description: 'Extensions and additional libraries for Kotlin' }
  ],
  
  php: [
    { id: 'laravel', name: 'Laravel', description: 'PHP framework for web application development' },
    { id: 'symfony', name: 'Symfony', description: 'Set of reusable PHP components and a framework' },
    { id: 'wordpress', name: 'WordPress', description: 'CMS and blogging platform' },
    { id: 'codeigniter', name: 'CodeIgniter', description: 'Powerful PHP framework with a small footprint' },
    { id: 'drupal', name: 'Drupal', description: 'Content management system and framework' }
  ]
};

// Database technologies across languages
const databaseTechnologies = [
  { id: 'mysql', name: 'MySQL', description: 'Open-source relational database management system' },
  { id: 'postgresql', name: 'PostgreSQL', description: 'Powerful, open-source object-relational database' },
  { id: 'mongodb', name: 'MongoDB', description: 'Document-oriented NoSQL database' },
  { id: 'redis', name: 'Redis', description: 'In-memory data structure store' },
  { id: 'sqlite', name: 'SQLite', description: 'Self-contained, serverless database engine' },
  { id: 'firebase', name: 'Firebase', description: 'Google\'s mobile app development platform with realtime database' },
  { id: 'dynamodb', name: 'DynamoDB', description: 'Amazon\'s NoSQL database service' },
  { id: 'cosmos', name: 'Azure Cosmos DB', description: 'Microsoft\'s globally distributed, multi-model database service' }
];

// Cloud platforms across languages
const cloudPlatforms = [
  { id: 'aws', name: 'AWS', description: 'Amazon Web Services cloud platform' },
  { id: 'azure', name: 'Azure', description: 'Microsoft\'s cloud computing platform' },
  { id: 'gcp', name: 'Google Cloud', description: 'Google\'s cloud computing services' },
  { id: 'heroku', name: 'Heroku', description: 'Platform as a service (PaaS) that enables developers to build and run applications' },
  { id: 'vercel', name: 'Vercel', description: 'Platform for frontend frameworks and static sites' },
  { id: 'netlify', name: 'Netlify', description: 'Platform for modern web projects' }
];

// Other common tools across languages
const commonTools = [
  { id: 'docker', name: 'Docker', description: 'Platform for developing, shipping, and running applications in containers' },
  { id: 'kubernetes', name: 'Kubernetes', description: 'Container orchestration system' },
  { id: 'git', name: 'Git', description: 'Distributed version control system' },
  { id: 'github', name: 'GitHub', description: 'Hosting platform for software development and version control using Git' },
  { id: 'gitlab', name: 'GitLab', description: 'Web-based DevOps lifecycle tool' },
  { id: 'jenkins', name: 'Jenkins', description: 'Open source automation server' },
  { id: 'graphql', name: 'GraphQL', description: 'Query language for APIs' },
  { id: 'rest', name: 'REST API', description: 'Architectural style for distributed systems' },
  { id: 'AI API calls', name: 'AI API calls', description: 'APIs for integrating AI capabilities into applications' }
];

export { frameworksData, databaseTechnologies, cloudPlatforms, commonTools };