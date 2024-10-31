"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var sdk_1 = require("@satstation-backend/sdk");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var bj, wallet, p2wpkh, psbt, txHex;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require("bitcoinjs-lib"); })];
                case 1:
                    bj = _a.sent();
                    wallet = new sdk_1.Wallet({
                        mnemonic: "miss canal major invest model expose exhaust lyrics nephew strong stand buffalo",
                        network: "regtest",
                    });
                    p2wpkh = wallet.p2wpkh(10);
                    console.log(p2wpkh.address);
                    psbt = bj.Psbt.fromHex("70736274ff0100d4020000000219ca2aa057a70bc7cec896d9a698596b0aefc9a6603d328db5d706f56e98ef060000000000ffffffff3a0822a714a86e72b7e7e65ba346b930b94ab667aab76211f27a540cc16f07d50100000000ffffffff04e8030000000000001976a9145589f890b404551b3d8eab2968041e10ae9db32f88ace8030000000000001600147863a2ce28ce317274fe77fca72312fe6f7506c200000000000000000f6a5d0c00ad6e01fa833d0000000a01bddbf505000000001600144bef57fbbca16b8583a6e800bd8a0491268bc37c00000000000100fdac01020000000202e76189b4676c5d169be248a63e5927bcbbb2a5e1919441d5aeceb12aaa0ff6000000006a473044022033544ef3c5d9966483d56d4963698b0786e623d093e408c7bea0b22ad4d4cedd02200abc1d7b297afe758c920ae76a8a41dc285df5c801d271c347d38b913d3d13a70121033aa2d9b60cc862a72ee2f10340a12fd45e6f6b8a776e53c9a6288292ce5f93f9ffffffff02e76189b4676c5d169be248a63e5927bcbbb2a5e1919441d5aeceb12aaa0ff6030000006b483045022100b8754571785b7eb2fab3d44071fa4a27e1db10a7f7d7c5573215c14cb931b3ea02204b7e38100d6276da0848ad1ad3093331a9549d5204ef8413e6a75bee2a726796012102c7f075c111c5ee2806d9f1dcebd773c7b3212e041042b3ff677461da63e7ad97ffffffff04e8030000000000001976a9145589f890b404551b3d8eab2968041e10ae9db32f88ace8030000000000001600147863a2ce28ce317274fe77fca72312fe6f7506c200000000000000000f6a5d0c00ad6e0184843d0000000a01f5b0f505000000001976a91465abd89345b0a45bd8a5e0d16948b48ef5c5046688ac000000002202033aa2d9b60cc862a72ee2f10340a12fd45e6f6b8a776e53c9a6288292ce5f93f9483045022100f755859a4110e68a036f8aba87142aa54bdbde7fae0a8c2d6dcc7306b309250b02202098f143f802e1cf39d159b9b631bd282da90e6baed57742a61ce7c90aa7a2f8010001011f00e1f505000000001600144bef57fbbca16b8583a6e800bd8a0491268bc37c0000000000");
                    psbt.signInput(1, p2wpkh.keypair);
                    psbt.finalizeAllInputs();
                    txHex = psbt.extractTransaction().toHex();
                    console.log(txHex);
                    return [2 /*return*/];
            }
        });
    });
}
main();
