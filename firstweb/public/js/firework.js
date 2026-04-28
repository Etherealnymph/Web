(function(){
	console.log("========= 烟花效果 =========");
	window.showAlert = function(){
		// 如果已经存在烟花界面，避免重复创建
		if(document.getElementById('fireworksCanvas')) return;
		const canvas = document.createElement('canvas');
		canvas.id = 'fireworksCanvas';
		canvas.style.position = 'fixed';
		canvas.style.left = '0';
		canvas.style.top = '0';
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		canvas.style.pointerEvents = 'none';
		canvas.style.zIndex = 9999;
		document.body.appendChild(canvas);

		// 创建居中返回按钮
		const btn = document.createElement('button');
		btn.id = 'fireworksReturnBtn';
		btn.textContent = '呜呜呜，我要回家！';
		btn.style.backgroundColor = '#00000000';
		btn.style.color = '#ffffff';
		btn.style.position = 'fixed';
		btn.style.left = '50%';
		btn.style.top = '95%';
		btn.style.transform = 'translate(-50%, -50%)';
		btn.style.zIndex = 10000;
		btn.style.padding = '10px 18px';
		btn.style.fontSize = '16px';
		btn.style.borderRadius = '6px';
		btn.style.border = 'none';
		btn.style.cursor = 'pointer';
		btn.style.pointerEvents = 'auto';
		document.body.appendChild(btn);
		const ctx = canvas.getContext('2d');

		function resize(){
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
		resize();
		window.addEventListener('resize', resize);

		const rockets = [];
		const particles = [];
		const gravity = 0.03;

		function rand(min, max){ return Math.random()*(max-min)+min }

		function launchRocket(){
			rockets.push({
				x: rand(canvas.width*0.2, canvas.width*0.8),
				y: canvas.height,
				vx: rand(-0.5,0.5),
				vy: rand(-0.5,-0.5),
				hue: rand(0,360)
			});
		}

		let audioCtx;
		function ensureAudio(){
			if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		}

		function playExplosionSound(x){
			try{
				ensureAudio();
				const now = audioCtx.currentTime;
				// noise burst
				const bufferSize = audioCtx.sampleRate * 0.25;
				const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
				const data = buffer.getChannelData(0);
				for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
				const src = audioCtx.createBufferSource();
				src.buffer = buffer;
				const noiseGain = audioCtx.createGain();
				noiseGain.gain.setValueAtTime(0.001, now);
				noiseGain.gain.linearRampToValueAtTime(0.8, now + 0.01);
				noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

				const panner = audioCtx.createStereoPanner();
				const pan = (x / canvas.width) * 2 - 1;
				panner.pan.setValueAtTime(pan, now);

				src.connect(noiseGain).connect(panner).connect(audioCtx.destination);
				src.start(now);

				// short low oscillator thump
				const osc = audioCtx.createOscillator();
				const oscGain = audioCtx.createGain();
				osc.type = 'sawtooth';
				osc.frequency.setValueAtTime(150, now);
				oscGain.gain.setValueAtTime(0.001, now);
				oscGain.gain.linearRampToValueAtTime(0.6, now + 0.01);
				oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
				osc.connect(oscGain).connect(panner).connect(audioCtx.destination);
				osc.start(now);
				osc.stop(now + 0.3);
			}catch(e){ /* 音频上下文创建可能被浏览器策略阻止 */ }
		}

		function explode(x,y,hue){
			playExplosionSound(x);
			const count = 40;
			for(let i=0;i<count;i++){
				const speed = rand(0.01,0.02);
				const angle = Math.random()*Math.PI*2;
				particles.push({
					x: x, y: y,
					vx: Math.cos(angle)*speed,
					vy: Math.sin(angle)*speed,
					life: Math.floor(rand(40,80)),
					age: 0,
					hue: hue + rand(-20,20)
				});
			}
		}

		let frames = 0;
		let raf;
		function cleanup(){
			if(raf) cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
			const c = document.getElementById('fireworksCanvas');
			if(c) c.remove();
			const b = document.getElementById('fireworksReturnBtn');
			if(b) b.remove();
			try{ if(audioCtx && audioCtx.state !== 'closed') audioCtx.close(); }catch(e){}
		}

		btn.addEventListener('click', cleanup);
		function loop(){
			raf = requestAnimationFrame(loop);
			frames++;

			ctx.globalCompositeOperation = 'source-over';
			ctx.fillStyle = '#000000';
			ctx.fillRect(0,0,canvas.width,canvas.height);
			ctx.globalCompositeOperation = 'lighter';

			if(Math.random() < 0.04) launchRocket();

			for(let i=rockets.length-1;i>=0;i--){
				const r = rockets[i];
				r.vy += gravity;
				r.x += r.vx;
				r.y += r.vy;
				ctx.beginPath();
				ctx.fillStyle = `hsl(${r.hue} 100% 60%)`;
				ctx.arc(r.x, r.y, 3, 0, Math.PI*2);
				ctx.fill();
				if(r.vy >= 0){
					explode(r.x, r.y, r.hue);
					rockets.splice(i,1);
				}
			}

			for(let i=particles.length-1;i>=0;i--){
				const p = particles[i];
				p.vy += gravity*0.2;
				p.vx *= 0.99; p.vy *= 0.99;
				p.x += p.vx; p.y += p.vy;
				p.age++;
				const alpha = Math.max(1 - p.age / p.life, 0);
				ctx.beginPath();
				ctx.fillStyle = `hsla(${p.hue} 100% 60% / ${alpha})`;
				ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
				ctx.fill();
				if(p.age >= p.life) particles.splice(i,1);
			}

			if(frames > 600 && rockets.length === 0 && particles.length === 0){
				cancelAnimationFrame(raf);
				window.removeEventListener('resize', resize);
				canvas.remove();
				const b = document.getElementById('fireworksReturnBtn');
				if(b) b.remove();
				try{ if(audioCtx && audioCtx.state !== 'closed') audioCtx.close(); }catch(e){}
			}
		}

		loop();
	};
})();