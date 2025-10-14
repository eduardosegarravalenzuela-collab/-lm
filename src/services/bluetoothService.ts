export interface BluetoothDevice {
  id: string;
  name: string;
  type: 'airtag' | 'tile' | 'smarttag' | 'generic';
  batteryLevel: number;
}

export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;

  async isBluetoothAvailable(): Promise<boolean> {
    if (!navigator.bluetooth) {
      return false;
    }
    return await navigator.bluetooth.getAvailability();
  }

  async requestDevice(): Promise<BluetoothDevice | null> {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API not supported');
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information']
      });

      if (!device.name) {
        throw new Error('Device name not available');
      }

      this.server = await device.gatt?.connect() || null;

      const batteryLevel = await this.getBatteryLevel();
      const deviceType = this.detectDeviceType(device.name);

      this.device = {
        id: device.id,
        name: device.name,
        type: deviceType,
        batteryLevel: batteryLevel
      };

      return this.device;
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      return null;
    }
  }

  private detectDeviceType(name: string): BluetoothDevice['type'] {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('airtag') || nameLower.includes('apple')) return 'airtag';
    if (nameLower.includes('tile')) return 'tile';
    if (nameLower.includes('smarttag') || nameLower.includes('samsung')) return 'smarttag';
    return 'generic';
  }

  private async getBatteryLevel(): Promise<number> {
    try {
      if (!this.server) return 100;

      const batteryService = await this.server.getPrimaryService('battery_service');
      const batteryCharacteristic = await batteryService.getCharacteristic('battery_level');
      const value = await batteryCharacteristic.readValue();
      return value.getUint8(0);
    } catch (error) {
      console.warn('Could not read battery level:', error);
      return 100;
    }
  }

  async updateBatteryLevel(): Promise<number> {
    return await this.getBatteryLevel();
  }

  disconnect(): void {
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
  }

  getDevice(): BluetoothDevice | null {
    return this.device;
  }
}

export const bluetoothService = new BluetoothService();
