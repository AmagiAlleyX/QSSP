/*!
 * Live2D Widget
 * https://github.com/stevenjoezhang/live2d-widget
 */

// Recommended to use absolute path for live2d_path parameter
// live2d_path 参数建议使用绝对路径
// const live2d_path = 'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.1/dist/';

(function() {
  // 暴露模型管理器供外部调用
  window.__live2dExposed = false;
  let hoverTipTimer = null;

  const hoverBodyTips = [
    '干嘛呢你，快把手拿开～～',
    '鼠…鼠标放错地方了！',
    '你要干嘛呀？',
    '喵喵喵？',
    '怕怕(ノ≧∇≦)ノ'
  ];

  function showHoverTip() {
    const tipsEl = document.getElementById('waifu-tips');
    if (!tipsEl) return;
    
    const priority = parseInt(sessionStorage.getItem('waifu-message-priority'), 10);
    if (!isNaN(priority) && priority > 8) return;
    
    const randomTip = hoverBodyTips[Math.floor(Math.random() * hoverBodyTips.length)];
    tipsEl.textContent = randomTip;
    tipsEl.classList.add('waifu-tips-active');
    sessionStorage.setItem('waifu-message-priority', '8');
    
    if (hoverTipTimer) {
      clearTimeout(hoverTipTimer);
    }
    hoverTipTimer = setTimeout(() => {
      tipsEl.classList.remove('waifu-tips-active');
      sessionStorage.removeItem('waifu-message-priority');
      hoverTipTimer = null;
    }, 4000);
  }

  function hideHoverTip() {
    const tipsEl = document.getElementById('waifu-tips');
    if (!tipsEl) return;
    
    const priority = parseInt(sessionStorage.getItem('waifu-message-priority'), 10);
    if (!isNaN(priority) && priority > 8) return;
    
    if (hoverTipTimer) {
      clearTimeout(hoverTipTimer);
      hoverTipTimer = null;
    }
    tipsEl.classList.remove('waifu-tips-active');
    sessionStorage.removeItem('waifu-message-priority');
  }

  function tryExposeLive2DModel() {
    if (window.__live2dExposed) return;
    
    const canvas = document.getElementById('live2d');
    
    if (canvas && canvas._viewInstance) {
      window.__live2dView = canvas._viewInstance;
      window.__live2dExposed = true;
      console.log('[Live2D] Model exposed to window.__live2dView');
      
      // 阻止默认的 hoverbody 事件，改用我们自己的精确区域检测
      window.addEventListener('live2d:hoverbody', (e) => {
        e.stopImmediatePropagation();
      }, true);
      
      // 自己监听 canvas 的 mouseenter/mouseleave，触发区域精确为 canvas 大小
      canvas.addEventListener('mouseenter', () => {
        showHoverTip();
      });
      
      canvas.addEventListener('mouseleave', () => {
        hideHoverTip();
      });
      
      // 监听 live2d-widget 内置的 tapbody 事件
      window.addEventListener('live2d:tapbody', () => {
        console.log('[Live2D] 内置 tapbody 事件触发');
      });
      
      // 绑定点击事件
      canvas.addEventListener('click', (e) => {
        const view = window.__live2dView;
        if (!view || !view.live2DMgr || !view.live2DMgr.model) return;
        
        const model = view.live2DMgr.model;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = -(e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        
        console.log('[Live2D] 点击位置:', { x: x.toFixed(3), y: y.toFixed(3) });
        
        // 使用简单的矩形碰撞检测作为备用方案
        // 头部区域: y > 0.2 (上半部分偏上)
        // 身体区域: -0.3 < y <= 0.2 (中间部分)
        let hitArea = null;
        if (y > 0.15 && Math.abs(x) < 0.4) {
          hitArea = 'head';
        } else if (y <= 0.15 && y > -0.5 && Math.abs(x) < 0.5) {
          hitArea = 'body';
        }
        
        console.log(`[Live2D] 备用检测命中: ${hitArea || '无'}`);
        
        // 如果命中身体，播放随机动作
        if (hitArea === 'body') {
          model.startRandomMotion('tap_body', 2);
          console.log('[Live2D] 播放 tap_body 随机动作');
        } else if (hitArea === 'head') {
          model.setRandomExpression();
          console.log('[Live2D] 设置随机表情');
        }
      });
    }
  }

  // Method to encapsulate asynchronous resource loading
  // 封装异步加载资源的方法
  function loadExternalResource(url, type) {
    return new Promise((resolve, reject) => {
      let tag;

      if (type === 'css') {
        tag = document.createElement('link');
        tag.rel = 'stylesheet';
        tag.href = url;
      }
      else if (type === 'js') {
        tag = document.createElement('script');
        tag.type = 'module';
        tag.src = url;
      }
      if (tag) {
        tag.onload = () => resolve(url);
        tag.onerror = () => reject(url);
        document.head.appendChild(tag);
      }
    });
  }

  (async () => {
    // 从当前脚本路径推断 live2d 目录
    const currentScript = document.currentScript || 
      (function() {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
          if (scripts[i].src.indexOf('autoload.js') > -1) {
            return scripts[i];
          }
        }
        return null;
      })();
    let live2d_path = '/live2d/';
    if (currentScript && currentScript.src) {
      live2d_path = currentScript.src.replace(/autoload\.js.*$/, '');
    }
    // If you are concerned about display issues on mobile devices, you can use screen.width to determine whether to load
    // 如果担心手机上显示效果不佳,可以根据屏幕宽度来判断是否加载
    // if (screen.width < 768) return;

    // 提前拦截 live2d:hoverbody 事件，确保在 waifu-tips.js 加载之前就生效
    window.addEventListener('live2d:hoverbody', (e) => {
      // 只有当鼠标确实在 canvas 元素上时才显示提示
      const canvas = document.getElementById('live2d');
      if (!canvas) {
        e.stopImmediatePropagation();
        return;
      }
      
      const rect = canvas.getBoundingClientRect();
      const lastPos = window.__lastMousePos || { x: 0, y: 0 };
      const isInCanvas = lastPos.x >= rect.left && 
                         lastPos.x <= rect.right && 
                         lastPos.y >= rect.top && 
                         lastPos.y <= rect.bottom;
      
      if (!isInCanvas) {
        e.stopImmediatePropagation();
      }
    }, true);

    // 跟踪鼠标位置
    window.addEventListener('mousemove', (e) => {
      window.__lastMousePos = { x: e.clientX, y: e.clientY };
    }, true);

    // Avoid cross-origin issues with image resources
    // 避免图片资源跨域问题
    const OriginalImage = window.Image;
    window.Image = function(...args) {
      const img = new OriginalImage(...args);
      img.crossOrigin = "anonymous";
      return img;
    };
    window.Image.prototype = OriginalImage.prototype;
    // Load waifu.css and waifu-tips.js
    // 加载 waifu.css 和 waifu-tips.js
    await Promise.all([
      loadExternalResource(live2d_path + 'waifu.css', 'css'),
      loadExternalResource(live2d_path + 'waifu-tips.js', 'js')
    ]);
    
    // 包装 initWidget 来暴露模型管理器
    const originalInitWidget = window.initWidget;
    window.initWidget = function(config) {
      // 调用原始 initWidget
      originalInitWidget(config);
    };
    
    // 定期检查模型是否加载完成
    const checkInterval = setInterval(() => {
      tryExposeLive2DModel();
      if (window.__live2dExposed) {
        clearInterval(checkInterval);
      }
    }, 500);
    
    // 30秒后停止检查
    setTimeout(() => clearInterval(checkInterval), 30000);
    
    // For detailed usage of configuration options, see README.en.md
    // 配置选项的具体用法见 README.md
    if (!window.__live2d_initialized) {
      window.__live2d_initialized = true
      initWidget({
        waifuPath: live2d_path + 'waifu-tips.json',
        cdnPath: live2d_path,
        cubism2Path: live2d_path + 'live2d.min.js',
        cubism5Path: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
        tools: ['hitokoto', 'switch-model', 'switch-texture', 'quit'],
        logLevel: 'warn',
        drag: false,
      })
    }
  })();

  console.log(`\n%cLive2D%cWidget%c\n`, 'padding: 8px; background: #cd3e45; font-weight: bold; font-size: large; color: white;', 'padding: 8px; background: #ff5450; font-size: large; color: #eee;', '');
})();

/*
く__,.ヘヽ.        /  ,ー､ 〉
         ＼ ', !-─‐-i  /  /´
         ／｀ｰ'       L/／｀ヽ､
       /   ／,   /|   ,   ,       ',
     ｲ   / /-‐/  ｉ  L_ ﾊ ヽ!   i
      ﾚ ﾍ 7ｲ｀ﾄ   ﾚ'ｧ-ﾄ､!ハ|   |
        !,/7 '0'     ´0iソ|    |
        |.从"    _     ,,,, / |./    |
        ﾚ'| i＞.｡,,__  _,.イ /   .i   |
          ﾚ'| | / k_７_/ﾚ'ヽ,  ﾊ.  |
            | |/i 〈|/   i  ,.ﾍ |  i  |
           .|/ /  ｉ：    ﾍ!    ＼  |
            kヽ>､ﾊ    _,.ﾍ､    /､!
            !'〈//｀Ｔ´', ＼ ｀'7'ｰr'
            ﾚ'ヽL__|___i,___,ンﾚ|ノ
                ﾄ-,/  |___.
                'ｰ'    !_,.:
*/
