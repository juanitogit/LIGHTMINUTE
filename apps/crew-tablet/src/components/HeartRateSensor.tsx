import { useEffect, useRef, useState } from "react";
import { decodeHeartRate } from "../lib/heartRate";
import { Panel } from "./primitives";

type Characteristic = EventTarget & {value?:DataView;startNotifications:()=>Promise<Characteristic>;stopNotifications:()=>Promise<Characteristic>};
type Device = EventTarget & {name?:string;gatt?:{connected:boolean;connect:()=>Promise<{getPrimaryService:(name:string)=>Promise<{getCharacteristic:(name:string)=>Promise<Characteristic>}>}>;disconnect:()=>void}};
type BluetoothApi = {requestDevice:(options:{filters:{services:string[]}[]})=>Promise<Device>};

export function HeartRateSensor() {
  const [value,setValue]=useState<number|null>(null);
  const [status,setStatus]=useState("Disconnected");
  const [busy,setBusy]=useState(false);
  const device=useRef<Device|null>(null);
  const generation=useRef(0);
  const characteristic=useRef<Characteristic|null>(null);
  const onValue=useRef<(event:Event)=>void>(()=>{});
  onValue.current=(event)=>{const data=(event.target as Characteristic).value;if(!data)return;try{setValue(decodeHeartRate(data));}catch{setStatus("Invalid sensor packet received.");}};
  const handler=useRef((event:Event)=>onValue.current(event));
  function disconnect(){generation.current++;characteristic.current?.removeEventListener("characteristicvaluechanged",handler.current);void characteristic.current?.stopNotifications().catch(()=>{});characteristic.current=null;const old=device.current;device.current=null;old?.gatt?.disconnect();setValue(null);setStatus("Disconnected");}
  useEffect(()=>()=>{generation.current++;characteristic.current?.removeEventListener("characteristicvaluechanged",handler.current);device.current?.gatt?.disconnect();device.current=null;},[]);
  async function connect(){
    const bluetooth=(navigator as Navigator & {bluetooth?:BluetoothApi}).bluetooth;
    if (!bluetooth){setStatus("Bluetooth is unavailable in this browser or device.");return;}
    const attempt=++generation.current;setBusy(true);setStatus("Choose a heart-rate device…");
    try{const selected=await bluetooth.requestDevice({filters:[{services:["heart_rate"]}]});if(attempt!==generation.current)return;device.current=selected;
      selected.addEventListener("gattserverdisconnected",()=>{if(device.current!==selected)return;setValue(null);setStatus("Device disconnected.");device.current=null;characteristic.current=null;},{once:true});
      const server=await selected.gatt?.connect();if(attempt!==generation.current){selected.gatt?.disconnect();return;}if(!server)throw Error("Bluetooth connection unavailable");
      const service=await server.getPrimaryService("heart_rate");const ch=await service.getCharacteristic("heart_rate_measurement");
      if(attempt!==generation.current){selected.gatt?.disconnect();return;}
      characteristic.current=ch;ch.addEventListener("characteristicvaluechanged",handler.current);await ch.startNotifications();if(attempt!==generation.current){selected.gatt?.disconnect();return;}setStatus(`Connected${selected.name?` to ${selected.name}`:""}.`);
    }catch(error){if(attempt===generation.current){setBusy(false);disconnect();setStatus(error instanceof Error ? `Could not connect: ${error.message}` : "Could not connect.");}}finally{if(attempt===generation.current)setBusy(false);}
  }
  const available="bluetooth" in navigator && window.isSecureContext;
  return <Panel title="Live heart-rate device" labelledBy="live-sensor-title"><p className="small muted">Optional real sensor reading, shown only on this device. It is separate from synthetic mission data and is not stored, sent or used by the decision engine.</p>
    <p role="status">{status}{value!==null?` ${value} beats/min.`:""}</p>
    <button type="button" className="btn" disabled={busy || (!available && !device.current)} onClick={()=>device.current?disconnect():void connect()}>{device.current?"Disconnect device":"Connect Bluetooth device"}</button>
    {!available?<p className="small muted">Requires HTTPS and a browser with Web Bluetooth support.</p>:null}
  </Panel>;
}
