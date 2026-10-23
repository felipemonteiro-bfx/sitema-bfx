// Nível do microfone em tempo real para a onda ao vivo: AnalyserNode sobre o MESMO stream da gravação, em um
// AudioContext à parte (não liga no destino, então não toca nada nem mexe no áudio gravado).
import { nivelDoQuadro } from './gravador-onda';

const INTERVALO_MS = 100;

/** Começa a medir; devolve a função que para e fecha o contexto. Sem Web Audio, não faz nada (a onda fica em pontinhos). */
export function iniciarNivel(stream: MediaStream, aoNivel: (nivel: number) => void): () => void {
  if (typeof AudioContext === 'undefined') return () => undefined;
  let ac: AudioContext;
  try { ac = new AudioContext(); } catch { return () => undefined; }
  void ac.resume().catch(() => undefined);
  const fonte = ac.createMediaStreamSource(stream);
  const analisador = ac.createAnalyser();
  analisador.fftSize = 1024;
  fonte.connect(analisador);
  const quadro = new Float32Array(analisador.fftSize);
  const timer = setInterval(() => { analisador.getFloatTimeDomainData(quadro); aoNivel(nivelDoQuadro(quadro)); }, INTERVALO_MS);
  return () => { clearInterval(timer); try { fonte.disconnect(); } catch { /* já desligado */ } void ac.close().catch(() => undefined); };
}
