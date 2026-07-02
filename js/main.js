// ===== Navbar Scroll Effect =====
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===== Terminal Typing Animation =====
const commands = [
    {
        text: 'moon run "Fix the authentication bug in login.ts"',
        output: [
            { text: '&#9656; Analyzing codebase...', class: 'info' },
            { text: '&#9656; Found issue in src/auth/login.ts:47', class: '' },
            { text: '&#9656; Applying fix and running tests...', class: '' },
            { text: '&#10003; All 24 tests passing', class: 'success' },
            { text: '&#10003; PR #142 opened successfully', class: 'success' }
        ]
    },
    {
        text: 'moon deploy --env production',
        output: [
            { text: '&#9656; Building Docker image...', class: 'info' },
            { text: '&#9656; Running pre-deploy checks...', class: '' },
            { text: '&#9656; Deploying to production cluster...', class: '' },
            { text: '&#10003; Deployment complete in 45s', class: 'success' },
            { text: '&#10003; Health checks passing', class: 'success' }
        ]
    },
    {
        text: 'moon refactor --scope src/api --pattern "extract-service"',
        output: [
            { text: '&#9656; Scanning 23 files in src/api/...', class: 'info' },
            { text: '&#9656; Identified 8 extraction candidates', class: '' },
            { text: '&#9656; Refactoring with backward compatibility...', class: '' },
            { text: '&#10003; Extracted 8 services, 0 breaking changes', class: 'success' },
            { text: '&#10003; Coverage maintained at 94%', class: 'success' }
        ]
    }
];

let currentCommand = 0;
const typedText = document.getElementById('typed-text');
const terminalOutput = document.getElementById('terminal-output');

function typeCommand(text, callback) {
    let i = 0;
    typedText.innerHTML = '';
    terminalOutput.innerHTML = '';

    function type() {
        if (i < text.length) {
            typedText.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, 30 + Math.random() * 40);
        } else {
            setTimeout(callback, 500);
        }
    }
    type();
}

function showOutput(lines, callback) {
    let i = 0;
    function showLine() {
        if (i < lines.length) {
            const lineEl = document.createElement('div');
            lineEl.className = `line ${lines[i].class}`;
            lineEl.innerHTML = lines[i].text;
            lineEl.style.animationDelay = `${i * 0.1}s`;
            terminalOutput.appendChild(lineEl);
            i++;
            setTimeout(showLine, 400);
        } else {
            setTimeout(callback, 3000);
        }
    }
    showLine();
}

function runTerminalAnimation() {
    const cmd = commands[currentCommand];
    typeCommand(cmd.text, () => {
        showOutput(cmd.output, () => {
            currentCommand = (currentCommand + 1) % commands.length;
            runTerminalAnimation();
        });
    });
}

// Start animation when terminal is visible
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            runTerminalAnimation();
            observer.disconnect();
        }
    });
}, { threshold: 0.5 });

const terminal = document.querySelector('.hero-terminal');
if (terminal) {
    observer.observe(terminal);
}

// ===== Mobile Menu Toggle =====
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const navActions = document.querySelector('.nav-actions');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-open');
        navActions.classList.toggle('mobile-open');
        mobileMenuBtn.classList.toggle('active');
    });
}

// ===== Smooth Scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ===== Intersection Observer for animations =====
const animatedElements = document.querySelectorAll('.feature-card, .agent-card, .step, .arch-node');
const animateObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    animateObserver.observe(el);
});
