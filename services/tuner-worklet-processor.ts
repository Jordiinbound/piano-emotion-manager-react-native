/**
 * TunerWorkletProcessor
 * 
 * AudioWorklet processor que corre en un thread dedicado del navegador.
 * Realiza la captura de muestras de audio y las envía al hilo principal
 * para procesamiento YIN. Esto elimina la latencia del hilo principal
 * y garantiza captura de audio sin interrupciones.
 * 
 * NOTA: Este código se serializa como string y se inyecta via Blob URL
 * porque React Native Web no soporta archivos .js separados para worklets.
 */

export const WORKLET_PROCESSOR_CODE = `
class TunerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.isActive = true;
    
    this.port.onmessage = (event) => {
      if (event.data.type === 'stop') {
        this.isActive = false;
      } else if (event.data.type === 'setBufferSize') {
        this.bufferSize = event.data.bufferSize;
        this.buffer = new Float32Array(this.bufferSize);
        this.writeIndex = 0;
      }
    };
  }
  
  process(inputs, outputs, parameters) {
    if (!this.isActive) return false;
    
    const input = inputs[0];
    if (!input || !input[0]) return true;
    
    const channelData = input[0];
    
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.writeIndex] = channelData[i];
      this.writeIndex++;
      
      if (this.writeIndex >= this.bufferSize) {
        // Buffer lleno: enviar al hilo principal
        this.port.postMessage({
          type: 'buffer',
          buffer: this.buffer.slice(),
          sampleRate: sampleRate,
        });
        this.writeIndex = 0;
      }
    }
    
    return true;
  }
}

registerProcessor('tuner-processor', TunerProcessor);
`;

/**
 * Crea un Blob URL con el código del AudioWorklet processor.
 * Necesario porque no podemos servir archivos .js separados en React Native Web.
 */
export function createWorkletBlobURL(): string {
  const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}
