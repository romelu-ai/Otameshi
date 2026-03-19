‘use strict’;

var srcImg = null, previewInterval = null;
var originalCanvas = document.getElementById(‘originalCanvas’);
var previewCanvas  = document.getElementById(‘previewCanvas’);

// スライダー表示
document.getElementById(‘mosaicSize’).oninput  = function(){ document.getElementById(‘mosaicVal’).textContent  = this.value + ‘px’; if(srcImg) renderPreview(Math.max(1,+this.value/2)); };
document.getElementById(‘duration’).oninput    = function(){ document.getElementById(‘durationVal’).textContent = this.value + ‘秒’; };
document.getElementById(‘fps’).oninput         = function(){ document.getElementById(‘fpsVal’).textContent      = this.value + ‘fps’; };
document.getElementById(‘outputSize’).oninput  = function(){ document.getElementById(‘sizeVal’).textContent     = this.value + ‘px’; };

// ファイル選択
document.getElementById(‘fileInput’).addEventListener(‘change’, function(){
if (this.files && this.files[0]) loadImg(this.files[0]);
});

// ドラッグ&ドロップ（PC向け）
var dz = document.getElementById(‘dropZone’);
dz.addEventListener(‘dragover’,  function(e){ e.preventDefault(); dz.classList.add(‘dragover’); });
dz.addEventListener(‘dragleave’, function(){ dz.classList.remove(‘dragover’); });
dz.addEventListener(‘drop’,      function(e){
e.preventDefault(); dz.classList.remove(‘dragover’);
var f = e.dataTransfer.files[0];
if (f && f.type.startsWith(‘image/’)) loadImg(f);
});

function loadImg(file) {
var reader = new FileReader();
reader.onload = function(ev) {
var image = new Image();
image.onload = function() {
srcImg = image;
var scale = Math.min(600/image.width, 600/image.height, 1);
var w = Math.round(image.width  * scale);
var h = Math.round(image.height * scale);
originalCanvas.width  = previewCanvas.width  = w;
originalCanvas.height = previewCanvas.height = h;
originalCanvas.getContext(‘2d’).drawImage(image, 0, 0, w, h);
renderPreview(1);
document.getElementById(‘previewArea’).style.display   = ‘grid’;
document.getElementById(‘controlsPanel’).style.display = ‘grid’;
document.getElementById(‘btnRow’).style.display        = ‘flex’;
document.getElementById(‘result-area’).style.display   = ‘none’;
dz.style.display = ‘none’;
};
image.src = ev.target.result;
};
reader.readAsDataURL(file);
}

// モザイク処理
function applyMosaic(srcCanvas, destCanvas, bs) {
var w = srcCanvas.width, h = srcCanvas.height;
var b = Math.max(1, Math.round(bs));
var sCtx = srcCanvas.getContext(‘2d’);
var dCtx = destCanvas.getContext(‘2d’);
if (b <= 1) { dCtx.drawImage(srcCanvas, 0, 0); return; }
var px  = sCtx.getImageData(0, 0, w, h);
var out = new ImageData(w, h);
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
dCtx.putImageData(out, 0, 0);
}

function renderPreview(bs) {
var ctx = previewCanvas.getContext(‘2d’);
ctx.drawImage(srcImg, 0, 0, previewCanvas.width, previewCanvas.height);
if (bs > 1.5) {
var tmp = document.createElement(‘canvas’);
tmp.width = previewCanvas.width; tmp.height = previewCanvas.height;
tmp.getContext(‘2d’).drawImage(srcImg, 0, 0, tmp.width, tmp.height);
applyMosaic(tmp, previewCanvas, bs);
}
}

function easeFn(t, type) {
if (type===‘ease-in’)    return t*t;
if (type===‘ease-out’)   return t*(2-t);
if (type===‘ease-inout’) return t<0.5 ? 2*t*t : -1+(4-2*t)*t;
return t;
}
function getProgress(t, dir, et) {
if (dir===‘inout’) return t<0.5 ? easeFn(t*2,et) : easeFn((1-t)*2,et);
if (dir===‘in’)    return easeFn(t,et);
return 1-easeFn(t,et);
}

// プレビューアニメ
document.getElementById(‘previewBtn’).onclick = function(){
if (!srcImg) return;
if (previewInterval){ clearInterval(previewInterval); previewInterval=null; }
var mb=+document.getElementById(‘mosaicSize’).value;
var dir=document.getElementById(‘direction’).value;
var et=document.getElementById(‘easing’).value;
var cd=+document.getElementById(‘duration’).value*1000;
var s=performance.now();
previewInterval=setInterval(function(){
var t=((performance.now()-s)%cd)/cd;
renderPreview(Math.max(1,getProgress(t,dir,et)*mb));
},1000/60);
};

// ZIP生成
document.getElementById(‘generateBtn’).onclick = function(){
if (!srcImg) return;
if (previewInterval){ clearInterval(previewInterval); previewInterval=null; }

var mb    = +document.getElementById(‘mosaicSize’).value;
var dur   = +document.getElementById(‘duration’).value;
var fpsV  = +document.getElementById(‘fps’).value;
var ms    = +document.getElementById(‘outputSize’).value;
var dir   = document.getElementById(‘direction’).value;
var et    = document.getElementById(‘easing’).value;

var totalFrames = Math.round(dur * fpsV);
var scale = Math.min(ms/srcImg.width, ms/srcImg.height, 1);
var ow = Math.round(srcImg.width*scale), oh = Math.round(srcImg.height*scale);

// 元画像をoffscreenに描画
var srcCanvas = document.createElement(‘canvas’);
srcCanvas.width=ow; srcCanvas.height=oh;
srcCanvas.getContext(‘2d’).drawImage(srcImg,0,0,ow,oh);

var frameCanvas = document.createElement(‘canvas’);
frameCanvas.width=ow; frameCanvas.height=oh;

var pw=document.getElementById(‘progressWrap’);
var pf=document.getElementById(‘progressFill’);
var st=document.getElementById(‘statusText’);
pw.classList.add(‘active’);
pf.style.width=‘0%’;
document.getElementById(‘result-area’).style.display=‘none’;
document.getElementById(‘generateBtn’).disabled=true;

var zip = new JSZip();
var fi  = 0;

function nextFrame(){
if (fi >= totalFrames){
st.textContent=‘ZIPを圧縮中…’;
zip.generateAsync({type:‘blob’}, function(meta){
pf.style.width = (50 + meta.percent*0.5) + ‘%’;
st.textContent = ’ZIP圧縮中… ’ + Math.round(50+meta.percent*0.5) + ‘%’;
}).then(function(blob){
var url = URL.createObjectURL(blob);
var link = document.getElementById(‘downloadLink’);
link.href = url;
link.download = ‘mosaic_frames.zip’;
document.getElementById(‘result-area’).style.display=‘block’;
pf.style.width=‘100%’;
st.textContent=’完了！ ’ + totalFrames + ’枚 / ’ + (ow+‘x’+oh) + ‘px’;
setTimeout(function(){ pw.classList.remove(‘active’); },800);
document.getElementById(‘generateBtn’).disabled=false;
});
return;
}

```
var t = totalFrames===1 ? 1 : fi/(totalFrames-1);
var progress = getProgress(t, dir, et);
var bs = Math.max(1, progress*mb);

var ctx = frameCanvas.getContext('2d');
ctx.clearRect(0,0,ow,oh);
ctx.drawImage(srcCanvas,0,0);
if (bs>1.5) applyMosaic(srcCanvas, frameCanvas, bs);

// PNGとしてZIPへ追加
var num = String(fi+1).padStart(5,'0');
var dataURL = frameCanvas.toDataURL('image/png');
var base64  = dataURL.split(',')[1];
zip.file('frame_'+num+'.png', base64, {base64:true});

pf.style.width = ((fi+1)/totalFrames*50)+'%';
st.textContent  = 'フレーム生成中... '+(fi+1)+'/'+totalFrames;
fi++;
setTimeout(nextFrame, 0);
```

}

st.textContent=‘フレームを生成中…’;
nextFrame();
};

// リセット
document.getElementById(‘resetBtn’).onclick = function(){
srcImg=null;
if(previewInterval){clearInterval(previewInterval);previewInterval=null;}
document.getElementById(‘previewArea’).style.display=‘none’;
document.getElementById(‘controlsPanel’).style.display=‘none’;
document.getElementById(‘btnRow’).style.display=‘none’;
document.getElementById(‘result-area’).style.display=‘none’;
document.getElementById(‘progressWrap’).classList.remove(‘active’);
document.getElementById(‘generateBtn’).disabled=false;
dz.style.display=‘block’;
document.getElementById(‘fileInput’).value=’’;
};