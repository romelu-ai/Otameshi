‘use strict’;

var img = null, previewInterval = null, recorder = null, renderInterval = null;
var originalCanvas = document.getElementById(‘originalCanvas’);
var previewCanvas = document.getElementById(‘previewCanvas’);

// — Slider labels —
document.getElementById(‘mosaicSize’).oninput = function() {
document.getElementById(‘mosaicVal’).textContent = this.value + ‘px’;
if (img) renderPreview(Math.max(1, +this.value / 2));
};
document.getElementById(‘duration’).oninput = function() { document.getElementById(‘durationVal’).textContent = this.value + ‘秒’; };
document.getElementById(‘fps’).oninput = function() { document.getElementById(‘fpsVal’).textContent = this.value + ‘fps’; };
document.getElementById(‘outputSize’).oninput = function() { document.getElementById(‘sizeVal’).textContent = this.value + ‘px’; };

// — Drop zone —
var dz = document.getElementById(‘dropZone’);
dz.addEventListener(‘dragover’, function(e) { e.preventDefault(); dz.classList.add(‘dragover’); });
dz.addEventListener(‘dragleave’, function() { dz.classList.remove(‘dragover’); });
dz.addEventListener(‘drop’, function(e) {
e.preventDefault(); dz.classList.remove(‘dragover’);
var f = e.dataTransfer.files[0];
if (f && f.type.startsWith(‘image/’)) loadImg(f);
});
document.getElementById(‘fileInput’).addEventListener(‘change’, function() {
if (this.files[0]) loadImg(this.files[0]);
});

function loadImg(file) {
var r = new FileReader();
r.onload = function(e) {
img = new Image();
img.onload = function() {
var scale = Math.min(600 / img.width, 600 / img.height, 1);
originalCanvas.width = previewCanvas.width = Math.round(img.width * scale);
originalCanvas.height = previewCanvas.height = Math.round(img.height * scale);
originalCanvas.getContext(‘2d’).drawImage(img, 0, 0, originalCanvas.width, originalCanvas.height);
renderPreview(1);
document.getElementById(‘previewArea’).style.display = ‘grid’;
document.getElementById(‘controlsPanel’).style.display = ‘grid’;
document.getElementById(‘btnRow’).style.display = ‘flex’;
document.getElementById(‘result-area’).classList.remove(‘show’);
dz.style.display = ‘none’;
};
img.src = e.target.result;
};
r.readAsDataURL(file);
}

// — Mosaic —
function applyMosaicInPlace(canvas, bs) {
if (bs <= 1) return;
var w = canvas.width, h = canvas.height;
var ctx = canvas.getContext(‘2d’);
var px = ctx.getImageData(0, 0, w, h);
var out = new ImageData(w, h);
var b = Math.max(1, Math.round(bs));
for (var y = 0; y < h; y += b) for (var x = 0; x < w; x += b) {
var r=0,g=0,bl=0,a=0,c=0;
for (var dy=0;dy<b&&y+dy<h;dy++) for (var dx=0;dx<b&&x+dx<w;dx++) {
var i=((y+dy)*w+(x+dx))*4; r+=px.data[i];g+=px.data[i+1];bl+=px.data[i+2];a+=px.data[i+3];c++;
}
r=r/c|0;g=g/c|0;bl=bl/c|0;a=a/c|0;
for (var dy=0;dy<b&&y+dy<h;dy++) for (var dx=0;dx<b&&x+dx<w;dx++) {
var i=((y+dy)*w+(x+dx))*4; out.data[i]=r;out.data[i+1]=g;out.data[i+2]=bl;out.data[i+3]=a;
}
}
ctx.putImageData(out, 0, 0);
}

function renderPreview(bs) {
var ctx = previewCanvas.getContext(‘2d’);
ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
if (bs > 1.5) {
// mosaic on a temp canvas to avoid modifying original
var tmp = document.createElement(‘canvas’);
tmp.width = previewCanvas.width; tmp.height = previewCanvas.height;
tmp.getContext(‘2d’).drawImage(img, 0, 0, tmp.width, tmp.height);
applyMosaicInPlace(tmp, bs);
ctx.drawImage(tmp, 0, 0);
}
}

function easeFn(t, type) {
if (type === ‘ease-in’) return t * t;
if (type === ‘ease-out’) return t * (2 - t);
if (type === ‘ease-inout’) return t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
return t;
}
function getProgress(t, dir, et) {
if (dir === ‘inout’) return t < 0.5 ? easeFn(t*2, et) : easeFn((1-t)*2, et);
if (dir === ‘in’) return easeFn(t, et);
return 1 - easeFn(t, et);
}

// — Preview animation —
document.getElementById(‘previewBtn’).onclick = function() {
if (!img) return;
if (previewInterval) { clearInterval(previewInterval); previewInterval = null; }
var mb = +document.getElementById(‘mosaicSize’).value;
var dir = document.getElementById(‘direction’).value;
var et = document.getElementById(‘easing’).value;
var cd = +document.getElementById(‘duration’).value * 1000;
var s = performance.now();
previewInterval = setInterval(function() {
var t = ((performance.now() - s) % cd) / cd;
renderPreview(Math.max(1, getProgress(t, dir, et) * mb));
}, 1000/60);
};

// — Generate video —
document.getElementById(‘generateBtn’).onclick = function() {
if (!img) return;
if (previewInterval) { clearInterval(previewInterval); previewInterval = null; }

var mb     = +document.getElementById(‘mosaicSize’).value;
var dur    = +document.getElementById(‘duration’).value;
var fpsVal = +document.getElementById(‘fps’).value;
var ms     = +document.getElementById(‘outputSize’).value;
var dir    = document.getElementById(‘direction’).value;
var et     = document.getElementById(‘easing’).value;

var scale = Math.min(ms / img.width, ms / img.height, 1);
var ow = Math.round(img.width * scale);
var oh = Math.round(img.height * scale);

// Offscreen canvas for recording
var offscreen = document.createElement(‘canvas’);
offscreen.width = ow; offscreen.height = oh;
var offCtx = offscreen.getContext(‘2d’);

// Detect best supported format
var mimeType = ‘’;
var formats = [‘video/mp4;codecs=avc1’, ‘video/webm;codecs=vp9’, ‘video/webm;codecs=vp8’, ‘video/webm’];
for (var i = 0; i < formats.length; i++) {
if (MediaRecorder.isTypeSupported(formats[i])) { mimeType = formats[i]; break; }
}
if (!mimeType) { alert(‘お使いのブラウザは動画録画に対応していません。Chrome / Edge をお試しください。’); return; }

var ext = mimeType.startsWith(‘video/mp4’) ? ‘mp4’ : ‘webm’;

var pw = document.getElementById(‘progressWrap’);
var pf = document.getElementById(‘progressFill’);
var st = document.getElementById(‘statusText’);
pw.classList.add(‘active’);
pf.style.width = ‘0%’;
st.textContent = ‘録画開始…’;
document.getElementById(‘generateBtn’).disabled = true;
document.getElementById(‘stopBtn’).style.display = ‘’;
document.getElementById(‘result-area’).classList.remove(‘show’);

var stream = offscreen.captureStream(fpsVal);
var chunks = [];
recorder = new MediaRecorder(stream, {
mimeType: mimeType,
videoBitsPerSecond: 8000000
});
recorder.ondataavailable = function(e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
recorder.onstop = function() {
if (renderInterval) { clearInterval(renderInterval); renderInterval = null; }
stream.getTracks().forEach(function(t) { t.stop(); });

```
var blob = new Blob(chunks, { type: mimeType.split(';')[0] });
var url = URL.createObjectURL(blob);

var video = document.getElementById('videoOutput');
video.src = url;

var link = document.getElementById('downloadLink');
link.href = url;
link.download = 'mosaic.' + ext;

document.getElementById('result-area').classList.add('show');
pf.style.width = '100%';
st.textContent = '完了！';
setTimeout(function() { pw.classList.remove('active'); }, 800);
document.getElementById('generateBtn').disabled = false;
document.getElementById('stopBtn').style.display = 'none';
recorder = null;
```

};

recorder.start(100); // collect every 100ms

var startTime = performance.now();
var totalMs = dur * 1000;

renderInterval = setInterval(function() {
var elapsed = performance.now() - startTime;
var t = Math.min(elapsed / totalMs, 1);
var progress = getProgress(t, dir, et);
var bs = Math.max(1, progress * mb);

```
offCtx.drawImage(img, 0, 0, ow, oh);
if (bs > 1.5) applyMosaicInPlace(offscreen, bs);

pf.style.width = (t * 100) + '%';
st.textContent = '録画中... ' + Math.round(t * 100) + '% (' + Math.round(elapsed/1000) + '/' + dur + '秒)';

if (t >= 1) {
  clearInterval(renderInterval);
  renderInterval = null;
  setTimeout(function() { if (recorder && recorder.state !== 'inactive') recorder.stop(); }, 200);
}
```

}, 1000 / fpsVal);
};

// — Stop button —
document.getElementById(‘stopBtn’).onclick = function() {
if (renderInterval) { clearInterval(renderInterval); renderInterval = null; }
if (recorder && recorder.state !== ‘inactive’) recorder.stop();
};

// — Reset —
document.getElementById(‘resetBtn’).onclick = function() {
img = null;
if (previewInterval) { clearInterval(previewInterval); previewInterval = null; }
if (renderInterval) { clearInterval(renderInterval); renderInterval = null; }
if (recorder && recorder.state !== ‘inactive’) { recorder.stop(); recorder = null; }
document.getElementById(‘previewArea’).style.display = ‘none’;
document.getElementById(‘controlsPanel’).style.display = ‘none’;
document.getElementById(‘btnRow’).style.display = ‘none’;
document.getElementById(‘result-area’).classList.remove(‘show’);
document.getElementById(‘progressWrap’).classList.remove(‘active’);
document.getElementById(‘generateBtn’).disabled = false;
document.getElementById(‘stopBtn’).style.display = ‘none’;
dz.style.display = ‘block’;
document.getElementById(‘fileInput’).value = ‘’;
};
