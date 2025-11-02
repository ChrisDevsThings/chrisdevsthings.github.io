document.addEventListener('DOMContentLoaded', () => {
	// Footer year
	const yearEl = document.getElementById('year');
	if (yearEl) yearEl.textContent = new Date().getFullYear();

	// Theme toggle: default is dark; toggle adds/removes `light` class on body and persists
	const themeToggle = document.getElementById('themeToggle');
	const applyTheme = (isLight) => {
		document.body.classList.toggle('light', isLight);
		themeToggle && themeToggle.setAttribute('aria-pressed', String(!!isLight));
		try { localStorage.setItem('theme', isLight ? 'light' : 'dark'); } catch (e) {}
	};
	// Initialize theme from localStorage (dark default)
	try {
		const saved = localStorage.getItem('theme');
		if (saved === 'light') applyTheme(true);
	} catch (e) { /* ignore */ }
	if (themeToggle) {
		themeToggle.addEventListener('click', () => {
			const isLight = document.body.classList.toggle('light');
			themeToggle.setAttribute('aria-pressed', String(!!isLight));
			try { localStorage.setItem('theme', isLight ? 'light' : 'dark'); } catch (e) {}
		});
	}

	// Blog modal functionality
	const blogModal = document.getElementById('blogModal');
	const blogModalTitle = document.getElementById('blogModalTitle');
	const blogModalDate = document.getElementById('blogModalDate');
	const blogModalCategory = document.getElementById('blogModalCategory');
	const blogModalContent = document.getElementById('blogModalContent');
	const closeBlogModal = document.getElementById('closeBlogModal');

	if (blogModal) {
		const openBlogModal = (post) => {
			if (!post) return;
			const title = post.querySelector('h2')?.textContent || 'Blog Post';
			const date = post.querySelector('time')?.textContent || '';
			const category = post.querySelector('.post-category')?.textContent || '';
			const content = post.querySelector('p')?.textContent || '';

			if (blogModalTitle) blogModalTitle.textContent = title;
			if (blogModalDate) blogModalDate.textContent = date;
			if (blogModalCategory) blogModalCategory.textContent = category;
			if (blogModalContent) blogModalContent.innerHTML = `<p class="muted">${content}</p>`;
			
			blogModal.setAttribute('aria-hidden', 'false');
		};

		// attach listeners to blog post buttons
		document.querySelectorAll('.view-post')?.forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				const post = btn.closest('.blog-post');
				openBlogModal(post);
			});
		});

		if (closeBlogModal) {
			closeBlogModal.addEventListener('click', () => {
				blogModal.setAttribute('aria-hidden', 'true');
			});
		}

		// also support the modal close button inside the panel
		const blogModalClose = document.getElementById('blogModalClose');
		if (blogModalClose) {
			blogModalClose.addEventListener('click', () => {
				blogModal.setAttribute('aria-hidden', 'true');
			});
		}

		// close blog modal on overlay click
		document.addEventListener('click', (e) => {
			if (blogModal.getAttribute('aria-hidden') === 'false' && e.target === blogModal) {
				blogModal.setAttribute('aria-hidden', 'true');
			}
		});

		// close on Escape (blog modal)
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && blogModal.getAttribute('aria-hidden') === 'false') {
				blogModal.setAttribute('aria-hidden', 'true');
			}
		});
	}

	// Nav toggle for small screens
	const navToggle = document.getElementById('navToggle');
	const siteNav = document.getElementById('siteNav');
	if (navToggle && siteNav) {
		navToggle.addEventListener('click', () => {
			siteNav.classList.toggle('show');
			const expanded = siteNav.classList.contains('show');
			navToggle.setAttribute('aria-expanded', expanded);
		});
	}

	// Simple typing effect for the tagline
	const taglineEl = document.getElementById('tagline');
	const phrases = [
		'Freelance Software Engineer.',
		'College Student.',
		'Proficient In C++ and Java.'
	];

	let pIndex = 0;
	let charIndex = 0;
	let typing = true;

	function tick() {
		if (!taglineEl) return;
		const current = phrases[pIndex];
		if (typing) {
			charIndex++;
			taglineEl.textContent = current.slice(0, charIndex);
			if (charIndex === current.length) {
				typing = false;
				setTimeout(tick, 1500);
				return;
			}
		} else {
			charIndex--;
			taglineEl.textContent = current.slice(0, charIndex);
			if (charIndex === 0) {
				typing = true;
				pIndex = (pIndex + 1) % phrases.length;
			}
		}
		setTimeout(tick, typing ? 50 : 30);
	}
	setTimeout(tick, 600);

	// Small hover-friendly effect for pfp: gentle pulse on load
	const pfp = document.getElementById('pfp');
	if (pfp) {
		pfp.style.filter = 'drop-shadow(0 12px 40px rgba(155,92,255,0.12))';
		setTimeout(() => { pfp.style.transition = 'transform 600ms ease'; pfp.style.transform = 'translateY(0)'; }, 400);
	}
  
		// IntersectionObserver: reveal sections/cards when visible
		const revealables = document.querySelectorAll('.reveal, .card, .profile-card, .tagline');
		if ('IntersectionObserver' in window) {
			const io = new IntersectionObserver((entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting) {
						e.target.classList.add('in-view');
						// optionally unobserve so it doesn't repeat
						io.unobserve(e.target);
					}
				});
			}, { threshold: 0.15 });
			revealables.forEach(el => io.observe(el));
		} else {
			// fallback: show everything
			revealables.forEach(el => el.classList.add('in-view'));
		}

		// small stagger for nav links on load
		const navLinks = document.querySelectorAll('.site-nav a');
		navLinks.forEach((a, i) => { a.style.transitionDelay = `${120 + i*80}ms`; });

		// Contact form handling (if present)
		const contactForm = document.getElementById('contactForm');
		if (contactForm) {
			const status = document.getElementById('formStatus');
			const modal = document.getElementById('successModal');
			const closeModal = document.getElementById('closeModal');
			// field-level error removal on input
			['name','email','message','subject'].forEach(id => {
				const el = document.getElementById(id);
				if (el) el.addEventListener('input', () => el.classList.remove('error'));
			});
			contactForm.addEventListener('submit', (ev) => {
				ev.preventDefault();
				const form = ev.target;
				const data = {
					name: form.name.value.trim(),
					email: form.email.value.trim(),
					subject: form.subject.value.trim(),
					message: form.message.value.trim(),
				};
				// basic validation
				let ok = true;
				if (!data.name) { ok = false; form.name.classList.add('error'); }
				if (!data.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { ok = false; form.email.classList.add('error'); }
				if (!data.message) { ok = false; form.message.classList.add('error'); }
				if (!ok) {
					if (status) status.textContent = 'Please fix the highlighted fields.';
					return;
				}
				// fake send
				if (status) status.textContent = 'Sending...';
				setTimeout(() => {
					if (status) status.textContent = '';
					form.reset();
					// show modal
					if (modal) {
						modal.setAttribute('aria-hidden','false');
					}
				}, 700);
			});

			if (closeModal) closeModal.addEventListener('click', () => {
				const modalEl = document.getElementById('successModal');
				if (modalEl) modalEl.setAttribute('aria-hidden','true');
			});

			// close modal on overlay click
	
	document.addEventListener('click', (e) => {
				const modalEl = document.getElementById('successModal');
				if (!modalEl) return;
				if (modalEl.getAttribute('aria-hidden') === 'false' && e.target === modalEl) {
					modalEl.setAttribute('aria-hidden','true');
				}
			});

			// close on Escape
			document.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					const modalEl = document.getElementById('successModal');
					if (modalEl && modalEl.getAttribute('aria-hidden') === 'false') modalEl.setAttribute('aria-hidden','true');
				}
			});

		
		}
});


		// Projects: open detail modal when a project card's "View" button is clicked
		const projectModal = document.getElementById('projectModal');
		const projectModalTitle = document.getElementById('projectModalTitle');
		const projectModalDesc = document.getElementById('projectModalDesc');
		const projectModalLink = document.getElementById('projectModalLink');
		const closeProjectModal = document.getElementById('closeProjectModal');

		function openProjectModal(card) {
			if (!card || !projectModal) return;
			const title = card.dataset.title || card.querySelector('h3')?.textContent || 'Project';
			const desc = card.dataset.desc || card.querySelector('p')?.textContent || '';
			const link = card.dataset.link || '#';
			projectModalTitle && (projectModalTitle.textContent = title);
			projectModalDesc && (projectModalDesc.textContent = desc);
			projectModalLink && (projectModalLink.href = link);
			projectModal.setAttribute('aria-hidden','false');
		}

		// attach listeners to view buttons
		document.querySelectorAll('.view-project').forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				const card = btn.closest('.project-card');
				openProjectModal(card);
			});
		});

		if (closeProjectModal) closeProjectModal.addEventListener('click', () => {
			if (projectModal) projectModal.setAttribute('aria-hidden','true');
		});

		// also support the modal close button inside the panel
		const projectModalClose = document.getElementById('projectModalClose');
		if (projectModalClose) projectModalClose.addEventListener('click', () => {
			if (projectModal) projectModal.setAttribute('aria-hidden','true');
		});

		// close project modal on overlay click
		document.addEventListener('click', (e) => {
			if (!projectModal) return;
			if (projectModal.getAttribute('aria-hidden') === 'false' && e.target === projectModal) {
				projectModal.setAttribute('aria-hidden','true');
			}
		});

		// close on Escape (project modal)
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				if (projectModal && projectModal.getAttribute('aria-hidden') === 'false') projectModal.setAttribute('aria-hidden','true');
			}
		});

