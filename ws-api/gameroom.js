require('./globals');
var config = require('./config');
var cardOps = require('./cards');

var filePlayer = require('./player');
var rules = require('./gamerules');
var Player = filePlayer.Player;
// const types=filePlayer.types;
const DRAW_BEGIN = 'begin',
    DRAW_NEXT = 'next',
    DRAW_CHA = 'cha',
    DRAW_GO = 'go';
// console.log('check!'+types.STYPE_ENTERSUCCESS);
class GameRoom {
    constructor(player) {
        this.players = [player];
        this.interval = 30000;
        var passCode;
        do {
            passCode = config.getRandomPasscode();
        } while (config.allRooms[passCode]);
        this.passCode = passCode;
        // console.log(types.STYPE_CREATESUCCESS);
        // player.sendMessage({'type':types.STYPE_CREATESUCCESS});
        player.sendMsgWithType(types.STYPE_CREATESUCCESS, {
            'passcode': passCode
        });
        config.allRooms[passCode] = this;
    }
    drawNext(nbComb, drawType, cards, player) {
        if (this.lastNBString) {
            if (rules.combCmp(nbComb, this.lastNBString)) {
                this.sendToAllPlayer(drawType,
                    { 'name': player.name, 'cards': cards }
                );
                var combtype = rules.getNBType(nbComb);
                player.sendMsgWithType(types.STYPE_DRAWSUCCEED,
                    { 'combtype': combtype }
                );
                switch (drawType) {
                    case types.STYPE_PLAYERCHA:
                    case types.STYPE_PLAYERGO:
                        if (this.roundNow[DRAW_NEXT]) {
                            this.roundNow[DRAW_NEXT].sendMsgWithType
                                (types.STYPE_ROUNDENDS);
                        }

                        break;
                    case types.STYPE_PLAYERDRAW:
                        if (this.roundNow[DRAW_CHA]) {
                            this.roundNow[DRAW_CHA].sendMsgWithType
                                (types.STYPE_ROUNDENDS);
                        }
                        if (this.roundNow[DRAW_GO]) {
                            this.roundNow[DRAW_GO].sendMsgWithType
                                (types.STYPE_ROUNDENDS);
                        }

                }
                this.lastPlayer = player;
                this.lastReal = player;
                this.lastType = type;
                return true;
            }
        }
        player.sendMsgWithType(types.STYPE_ENTERFAILED);
        return false;
    }
    playerDrawCards(player, cards, drawType) {
        var nbComb = cardOps.cardsToNBString(cards);
        if (rules.validComb(nbComb)) {
            switch (drawType) {
                case DRAW_BEGIN:
                    this.sendToAllPlayer(types.STYPE_PLAYERDRAW,
                        { 'name': player.name, 'cards': cards }
                    );
                    this.beginNotRespond = null;
                    return true;
                case DRAW_CHA:
                    return this.drawNext(nbTypes.VIRTUAL_CHA,
                        types.STYPE_PLAYERCHA, cards, player);
                case DRAW_GO:
                    return this.drawNext(nbTypes.VIRTUAL_GO,
                        types.STYPE_PLAYERGO, cards, player);
                case DRAW_NEXT:
                    if (this.drawNext(nbComb,
                        types.STYPE_PLAYERDRAW, cards, player)) {
                        this.nextNotRespond = null;
                    }

            }
        }
        return false;
    }
    sendToAllPlayer(type, msg) {
        for (var i in this.players) {
            this.players[i].sendMsgWithType(type, msg);
        }
    }
    checkCGAndResetLast(player, cards) {
        var nbS = cardOps.cardsToNBString(cards);
        var type = rules.getNBType(nbS);
        // var ret;
        this.roundNow = [];
        if (type === nbTypes.NBT_CHA) {//go
            for (var i in this.players) {
                if (this.players[i].haveGo(cards)) {
                    this.roundNow[nbTypes.NBT_GO] = this.players[i];
                }
            }
        } else if (type === nbTypes.NBT_SINGLE) {//cha check
            for (var i in this.players) {
                if (this.players[i].haveCha(cards)) {
                    this.roundNow[nbTypes.NBT_CHA] = this.players[i];
                }
            }
        }
        this.lastNBString = nbS;
        this.nextPlayer();
        // return ret;
    }
    playerWins(player) {
        if (!this.wins.includes(player)) {
            this.wins.push(player);
            if (this.wins.length >= this.players.length - 1) {
                var lost = this.getNxtNotWonPlayer(player);
                lost.sendMsgWithType(types.STYPE_LOSE);
                this.endGame();
            }
            this.sendToAllPlayer(types.STYPE_WINS, {
                'name': player.name
            });
            if (this.lastPlayer)
                this.lastPlayer = this.getNxtNotWonPlayer(this.lastPlayer);
            if (this.lastReal)
                this.lastReal = this.getNxtNotWonPlayer(this.lastReal);
        }

    }
    getNxtNotWonPlayer(nowPlayer) {
        var nxtPlayer = nowPlayer;
        while (!wins.includes(nxtPlayer)) {
            nxtPlayer = this.players[(nowPlayer + 1) % this.players.length];
        }
        return nxtPlayer;
    }
    nextPlayer() {
        var nowPlayer = this.players.indexOf(this.lastReal);
        var nxtPlayer = this.getNxtNotWonPlayer(nowPlayer);
        if (nxtPlayer === this.lastPlayer) {
            this.roundNow[DRAW_BEGIN] = nxtPlayer;
        } else {
            this.roundNow[DRAW_NEXT] = nxtPlayer;
        }
        if (this.roundNow[DRAW_BEGIN]) this.roundNow[DRAW_BEGIN].drawType = DRAW_BEGIN;
        if (this.roundNow[DRAW_NEXT]) this.roundNow[DRAW_NEXT].drawType = DRAW_NEXT;
        if (this.roundNow[DRAW_CHA]) this.roundNow[DRAW_CHA].drawType = DRAW_CHA;
        if (this.roundNow[DRAW_GO]) this.roundNow[DRAW_GO].drawType = DRAW_GO;
        this.roundSendAuto();
    }
    roundSendAuto() {
        var begin = this.roundNow[DRAW_BEGIN],
            next = this.roundNow[DRAW_NEXT],
            cha = this.roundNow[DRAW_CHA],
            go = this.roundNow[DRAW_GO];
        this.roundSendMsg(begin, nxt, cha, go);
    }
    passThisRound(player) {
        this.lastReal = player;
        this.sendToAllPlayer(types.STYPE_PLAYERPASS,
            { 'name': player.name }
        );
    }

    addNewPlayer(player, passCode) {
        if (passCode !== this.passCode) {
            player.sendMsgWithType(types.STYPE_ENTERFAILED, {
                'reason': 'Passcode Incorrect :' + passCode
            });
            return false;
        }
        var names = [];
        this.sendToAllPlayer(types.STYPE_ENTERS,
            { 'name': player.name }
        );
        for (var i in this.players) {
            names.push(this.players[i].name);
        }
        player.sendMsgWithType(types.STYPE_ENTERSUCCESS,
            { 'names': names }
        );
        this.players.push(player);
        return true;
    }

    endGame() {
        this.sendToAllPlayer(types.STYPE_GAMEENDS);
        this.lastNBString = undefined;
    }
    beginAuto() {
        if (this.beginNotRespond) {
            this.beginNotRespond.autoDraw();
        }
    }
    nextAuto() {
        if (this.nextNotRespond) {
            this.nextNotRespond.autoPass();
        }
    }
    roundSendMsg(begin = null, nxt = null, cha = null, go = null) {
        var msg = {
            'begin': begin ? begin.name : null,
            'next': nxt ? nxt.name : null,
            'cha': cha ? cha.name : null,
            'go': go ? go.name : null
        };
        this.beginNotRespond = begin;
        this.nextNotRespond = nxt;
        if (begin) setTimeout(this.beginAuto, this.interval);
        if (nxt) setTimeout(this.nextAuto, this.interval);
        this.sendToAllPlayer(types.STYPE_PLAYERROUND, msg);
    }

    beginGame(playerName) {
        if (playerName === this.players[0].name) {
            //game begins
            var cardsForEach = cardOps.distributeCards(this.players.length);
            for (var i in cardsForEach) {
                this.players[i].cards = cardsForEach[i];
                this.players[i].sendMsgWithType('card',{'cards':cardsForEach[i]});
            }

            var startWith = Math.floor(Math.random() * this.players.length);
            this.roundSendMsg(this.players[startWith].name);
            this.roundNow[DRAW_BEGIN] = startWith;

            this.lastNBString = undefined;
            this.lastPlayer = undefined;
            this.lastType = undefined;
            this.lastReal = undefined;
            this.roundNow = [];
            return true;
        }
        return false;
    }
}
module.exports = {
    GameRoom: GameRoom,
    getRoom: function (code) {
        return config.allRooms[code];
    }
};