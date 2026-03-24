window.WearablesStudio = (() => {
  function createNotice(message) {
    return `<div class="notice">${message}</div>`;
  }

  function initDesignStudio({ signedIn }) {
    const form = document.getElementById('design-form');
    if (!form) return;
    const textInput = document.getElementById('text-content');
    const textNode = document.getElementById('canvas-text');
    const textX = document.getElementById('text-x');
    const textY = document.getElementById('text-y');
    const textSize = document.getElementById('text-size');
    const imageUpload = document.getElementById('artwork-upload');
    const imageNode = document.getElementById('canvas-image');
    const imageX = document.getElementById('image-x');
    const imageY = document.getElementById('image-y');
    const elementsField = document.getElementById('design-elements');
    const imageUrlField = document.getElementById('design-image-url');
    const message = document.getElementById('design-message');
    let uploadedImage = '';

    function sync() {
      textNode.textContent = textInput.value;
      textNode.style.left = `${textX.value}%`;
      textNode.style.top = `${textY.value}%`;
      textNode.style.fontSize = `${textSize.value}px`;
      imageNode.style.left = `${imageX.value}%`;
      imageNode.style.top = `${imageY.value}%`;
      const elements = [
        { id: 'text-1', type: 'text', content: textInput.value, x: Number(textX.value), y: Number(textY.value), fontSize: Number(textSize.value) }
      ];
      if (uploadedImage) {
        elements.push({ id: 'image-1', type: 'image', content: uploadedImage, x: Number(imageX.value), y: Number(imageY.value), width: 140 });
      }
      elementsField.value = JSON.stringify(elements);
    }

    [textInput, textX, textY, textSize, imageX, imageY].forEach((input) => input.addEventListener('input', sync));
    imageUpload.addEventListener('change', () => {
      const file = imageUpload.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        uploadedImage = String(reader.result || '');
        imageNode.src = uploadedImage;
        imageUrlField.value = uploadedImage;
        imageNode.classList.remove('hidden');
        sync();
      };
      reader.readAsDataURL(file);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!signedIn) {
        message.innerHTML = createNotice('Please sign in before saving a design.');
        return;
      }
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.elements = JSON.parse(payload.elements || '[]');
      const response = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      message.innerHTML = createNotice(response.ok ? 'Design saved and published to the marketplace.' : (result.error || 'Unable to save design.'));
    });

    sync();
  }

  function initCheckout({ designs }) {
    const form = document.getElementById('checkout-form');
    if (!form) return;
    const designSelect = document.getElementById('checkout-design');
    const preview = document.getElementById('checkout-preview');
    const qrPanel = document.getElementById('checkout-qr-panel');
    const message = document.getElementById('checkout-message');

    function renderPreview() {
      const design = designs.find((entry) => entry.id === designSelect.value) || designs[0];
      if (!design) return;
      preview.innerHTML = `<div class="card-media"><img src="${design.imageUrl}" alt="${design.title}" /></div><div class="card-body" style="padding-inline:0;padding-bottom:0"><h3>${design.title}</h3><p class="muted">${design.description}</p><div class="label">500 EGP</div></div>`;
    }

    designSelect.addEventListener('change', renderPreview);
    renderPreview();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      message.innerHTML = createNotice(response.ok ? 'Order created. Please visit the store to complete payment.' : (result.error || 'Unable to create order.'));
      if (!response.ok) return;
      qrPanel.classList.remove('hidden');
      qrPanel.innerHTML = `<div class="grid cols-2"><div><h3>Order QR</h3><img src="${result.orderQr}" alt="Order QR" class="qr-image" /><a class="button-ghost" download="${result.order.id}-order.svg" href="${result.orderQr}">Download QR</a></div><div><h3>Pickup QR</h3><img src="${result.pickupQr}" alt="Pickup QR" class="qr-image" /><a class="button-ghost" download="${result.order.id}-pickup.svg" href="${result.pickupQr}">Download QR</a><p class="muted">Use this QR in store to retrieve order ${result.order.id} instantly.</p></div></div>`;
    });
  }

  function initDashboardScanner() {
    const form = document.getElementById('scan-form');
    if (!form) return;
    const input = document.getElementById('scan-input');
    const result = document.getElementById('scan-result');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const parsed = JSON.parse(input.value);
        result.innerHTML = parsed.orderId
          ? createNotice(`Loaded ${parsed.orderId}. Use the Orders table above to update payment or production status.`)
          : createNotice('QR data parsed, but no orderId was found.');
      } catch (error) {
        result.innerHTML = createNotice('Paste raw QR JSON payload to simulate scanning.');
      }
    });
  }

  return { initCheckout, initDashboardScanner, initDesignStudio };
})();
