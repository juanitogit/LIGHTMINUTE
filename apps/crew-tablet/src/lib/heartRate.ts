/** Bluetooth SIG Heart Rate Measurement: flag bit 0 selects uint8 or uint16. */
export function decodeHeartRate(view:DataView):number {
  if (view.byteLength < 2) throw new Error("Incomplete heart-rate packet");
  const wide = (view.getUint8(0) & 1) !== 0;
  if (wide && view.byteLength < 3) throw new Error("Incomplete heart-rate packet");
  return wide ? view.getUint16(1,true) : view.getUint8(1);
}
