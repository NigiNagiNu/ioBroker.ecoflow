"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_axios = __toESM(require("axios"));
class Ecoflow extends utils.Adapter {
  sn = "";
  apikey = "";
  secretkey = "";
  polltime = 0;
  timeout = 1e3;
  adapterIntervals;
  offlineFlag = false;
  constructor(options = {}) {
    super({
      ...options,
      name: "ecoflow"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    if (this.config.sn) {
      this.sn = this.config.sn;
      this.log.debug("SN found:" + this.sn);
    } else {
      this.log.error("No secretkey is set, adapter stop");
      return;
    }
    if (this.config.apikey) {
      this.apikey = this.config.apikey;
      this.log.debug("ApiKey found:" + this.apikey);
    } else {
      this.log.error("No apikey is set, adapter stop");
      return;
    }
    if (this.config.secretkey) {
      this.secretkey = this.config.secretkey;
      this.log.debug("Secret-Key found:" + this.secretkey);
    } else {
      this.log.error("No secretkey is set, adapter stop");
      return;
    }
    if (this.config.polltime > 0) {
      this.polltime = this.config.polltime;
      this.timeout = this.polltime * 1e3 - 500;
    } else {
      this.log.error("Wrong Polltime (polltime < 0), adapter stop");
      return;
    }
    this.getEcoflowData();
    this.adapterIntervals = this.setInterval(() => this.getEcoflowData(), this.polltime * 1e3);
  }
  onUnload(callback) {
    try {
      clearInterval(this.adapterIntervals);
      callback();
    } catch (e) {
      callback();
    }
  }
  getEcoflowData() {
    this.log.debug("Ask Data from ecoflow cloud API");
    try {
      this.log.debug("call: https://api.ecoflow.com/iot-service/open/api/device/queryDeviceQuota?sn=" + this.sn);
      (0, import_axios.default)("https://api.ecoflow.com/iot-service/open/api/device/queryDeviceQuota?sn=" + this.sn, {
        headers: {
          "Content-Type": "application/json",
          "appKey": this.apikey,
          "secretKey": this.secretkey
        },
        timeout: this.timeout
      }).then(async (response) => {
        this.log.debug("Get-Data from ecoflow:" + JSON.stringify(response.data));
        if (response.data.data === void 0) {
          if (response.data.code === "6012") {
            if (!this.offlineFlag) {
              if (this.config.offlineLogLevel === "info") {
                this.log.info(response.data.message);
              } else if (this.config.offlineLogLevel === "warn") {
                this.log.warn(response.data.message);
              } else {
                this.log.error(response.data.message);
              }
              this.offlineFlag = true;
            }
          } else {
            this.log.error(response.data.message);
          }
          this.setState("info.connection", false, true);
        } else {
          this.offlineFlag = false;
          await this.setStateAsync("status.soc", { val: response.data.data.soc, ack: true });
          await this.setStateAsync("status.remainTime", { val: response.data.data.remainTime, ack: true });
          await this.setNewRemainTime(response.data.data.remainTime);
          await this.setStateAsync("status.wattsOutSum", { val: response.data.data.wattsOutSum, ack: true });
          await this.setStateAsync("status.wattsInSum", { val: response.data.data.wattsInSum, ack: true });
          this.log.debug("Data received and wrote in objects");
          this.setState("info.connection", true, true);
        }
      }).catch((error) => {
        this.log.error(error.message);
        this.setState("info.connection", false, true);
      });
    } catch (error) {
      this.setState("info.connection", false, true);
      if (typeof error === "string") {
        this.log.error(error);
      } else if (error instanceof Error) {
        this.log.error(error.message);
      }
    }
  }
  async setNewRemainTime(remaintime) {
    await this.setStateAsync("status.remainTimeDay", { val: Math.floor(remaintime / 60 / 24), ack: true });
    await this.setStateAsync("status.remainTimeHour", { val: Math.floor(remaintime / 60), ack: true });
    await this.setStateAsync("status.remainTimeMinute", { val: Math.floor(remaintime % 60), ack: true });
  }
}
if (require.main !== module) {
  module.exports = (options) => new Ecoflow(options);
} else {
  (() => new Ecoflow())();
}
//# sourceMappingURL=main.js.map
