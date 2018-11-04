var chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';

var eos = null;
var betstate = 0;
var betamount = '';
var referralsaccount = '';
var timeout = 0;
var memo = '';
var balance = -1;
var balanceUnder = 0;
var checkTokenQuantityTimeout = 2000;
var hasCPU = false;
var cpuAvailable = '';
var network = null;
var identity = null;
var cpuUnder = 0;
var betaccount = '';
var eosing = false;//eos是否在请求中
var chars = 'abcefghijlmnopqrstuvwxyz-';

var bedStatus = {
    playerSeed: '',
    aCount: 0,
    otherCardSum: 0,
    hits: {},
    doubles: {},
    stand: 0,
    actions: []
}

const START_NEW_GAME = 1; //开始新一局游戏
const STAND_GAME = 2; //停牌
const HIT_GAME = 3; //拿牌
const DOUBLE_GAME = 4; // DOUBLUE
const NO_INSURANCE_GAME = 5; //不买保险

const runing_status = {
    1: '新局',
    2: '停牌',
    3: '拿牌',
    4: '加倍',
}
var all_num = 0
var win_num = 0
var pin_num = 0

//获取牌名
function getCardName(cardNum) {
    if (cardNum === 1) {
        return 'A';
    }
    else if (cardNum === 11) {
        return 'J';
    }
    else if (cardNum === 12) {
        return 'Q';
    }
    else if (cardNum === 13) {
        return 'K';
    }
    else {
        return cardNum;
    }
}

// 获取牌的数字
function getCardNum(cardId) {
    var cardNum;
    var cardName;
    cardId += 1;
    if (cardId > 52) {
        return {
            'num': -1,
            'name': '未知'
        }
    }
    if (cardId <= 13) {
        cardNum = cardId;
        cardName = "红桃" + getCardName(cardNum);
    }
    else if (cardId <= 26) {
        cardNum = cardId - 13;
        cardName = "方块" + getCardName(cardNum);
    }
    else if (cardId <= 39) {
        cardNum = cardId - 26;
        cardName = "梅花" + getCardName(cardNum);
    }
    else {
        cardNum = cardId - 39;
        cardName = "黑桃" + getCardName(cardNum);
    }
    return {
        'num': cardNum,
        'name': cardName
    }
}

//生成随机数
function randomString(t) {
    //return 'aw4AlkzGToyVNxJI7rWiPZ3dOHWq6OyR';
    for (var n = 'ABCD1EF!GHIJK=LMN2OPQR3S;TUVWXYZ"abcdefghijklmnopqrstu/vwxyz123|4567890', e = '', o = 0; o < t; o++)
        e += n.charAt(Math.floor(Math.random() * n.length));
    return e
}

//租用CPU
function rent() {
    if (identity == null) {
        log("请登陆");
        return;
    }
    log(new Date() + ' 开始向CPU租用1天的CPU资源，价格是：0.1000 EOS 一天');
    transfer('cpubankeosio', "0.1000 EOS", '1d ' + getAccountName() + ' cpu', function (trx) {
        document.getElementById('rentResult').innerHTML = '成功租用了1天的CPU资源';
        log(new Date() + ' 交易ID: ' + trx.transaction_id + ' 成功租用了1天的CPU资源');
    }, function (err) {
        var message = err.message == undefined ? JSON.parse(err).error.details[0].message : err.message;
        if (message == 'User rejected the signature request' || message == 'Invalid packed transaction') {
            document.getElementById('rentResult').innerHTML = '用户取消租用CPU';
            log(new Date() + ' 用户取消租用CPU');
            return;
        }
        if (message == 'assertion failure with message: overdrawn balance') {
            document.getElementById('rentResult').innerHTML = '租用失败：CPU银行正在备货中，请稍后重试';
            log(new Date() + ' 租用失败：CPU银行正在备货中，请稍后重试');
            return;
        }
        document.getElementById('rentResult').innerHTML = '租用失败：' + message;
        log(new Date() + ' 租用失败：' + message);
    });
}

//日志:
function log(msg) {
    console.log(msg);
    var txtResults = document.getElementById('txtResults');
    var html = txtResults.innerHTML;
    var items = html == '' ? [] : html.split('\n');
    var overflow = items.length - 100;
    if (overflow > 0) {
        items.splice(0, overflow);
    }
    items.push(msg);
    txtResults.innerHTML = items.join('\n');
    txtResults.scrollTop = txtResults.scrollHeight;
}

//历史
function history(msg) {
    var txtHistory = document.getElementById('txtHistory');
    var html = txtHistory.innerHTML;
    var items = html == '' ? [] : html.split('\n');
    items.push(msg);
    txtHistory.innerHTML = items.join('\n');
    txtHistory.scrollTop = txtHistory.scrollHeight;
}

function checkoutNetworks() {
    var httpEndpoint = document.getElementById('txtHttpEndpoint').value.split('://');
    var host = httpEndpoint[1].split(':');

    network = {
        blockchain: 'eos',
        host: host[0],
        port: host.length > 1 ? host[0] : (httpEndpoint[0].toLowerCase() == 'https' ? 443 : 80),
        chainId: chainId,
        protocol: httpEndpoint[0],
    };

    eos = scatter.eos(network, Eos, { expireInSeconds: 60 }, "https");
    log('网络参数：' + JSON.stringify(network));
}

function checkInputs() {
    betamount = document.getElementById('txtAmount').value;
    referralsaccount = document.getElementById('txtReferrals').value;
    timeout = new Number(document.getElementById('txtTimeout').value).valueOf();
    balanceUnder = new Number(document.getElementById('txtBalanceUnder').value).valueOf();
    cpuUnder = new Number(document.getElementById('txtCPUUnder').value).valueOf();

    if (isNaN(timeout)) {
        timeout = 0;
    }

    if (isNaN(balanceUnder)) {
        balanceUnder = 0;
    }

    if (isNaN(cpuUnder)) {
        cpuUnder = 0;
    }
}

function startGame() {
    if (isRunning()) {
        return;
    }

    if (identity == null) {
        alert("请登陆");
        return;
    }

    checkInputs();
    checkoutNetworks()

    betstate = 1;
    disableInputs(true);
    document.getElementById('txtResults').innerHTML = '';
    setTimeout(newGame, 1000);
    document.getElementById('lbScriptStatus').innerHTML = '已经启动';
}

function stopGame() {
    betstate = 0;
    disableInputs(false);
    document.getElementById('lbScriptStatus').innerHTML = '已经停止';
}

function disableInputs(disabled) {
    document.getElementById('txtHttpEndpoint').disabled = disabled;
    document.getElementById('txtAmount').disabled = disabled;
    document.getElementById('txtBalanceUnder').disabled = disabled;
    document.getElementById('txtReferrals').disabled = disabled;
    document.getElementById('txtTimeout').disabled = disabled;

    document.getElementById('btnLogin').disabled = disabled;
    document.getElementById('btnLogout').disabled = disabled;

    document.getElementById('btnUpdateAmount5').disabled = disabled;
    document.getElementById('btnUpdateAmount6').disabled = disabled;

    document.getElementById('btnUpdateTimeout1').disabled = disabled;
    document.getElementById('btnUpdateTimeout4').disabled = disabled;
    document.getElementById('btnUpdateTimeout5').disabled = disabled;
}

function lockGame() {
    disableInputs(true);
}

function unlockGame() {
    disableInputs(false);
}

function updateInputValue(id, value) {
    document.getElementById(id).value = value;
}

function multiplyInputValue(id, factor, defaultValue, fixedNum, unit, min, max) {
    var originalValue = document.getElementById(id).value.split(' ')[0];
    originalValue = new Number(originalValue).valueOf();
    if (isNaN(originalValue)) {
        originalValue = defaultValue;
    }
    var factor = new Number(factor).valueOf();
    if (isNaN(factor)) {
        factor = 1;
    }
    var newValue = originalValue * factor;
    if (min > 0 && newValue < min) {
        newValue = min;
    }
    if (max > 0 && newValue > max) {
        newValue = max;
    }
    newValue = new Number(newValue).toFixed(fixedNum);
    if (unit != undefined && unit.length > 0) {
        newValue = newValue + ' ' + unit;
    }
    document.getElementById(id).value = newValue;
}

function getAccountName() {
    if (identity == null || identity.accounts == null || identity.accounts.length == 0)
        return betaccount;
    const account = identity.accounts.find(x => x.blockchain === network.blockchain);
    return account.name;
}

function isRunning() {
    return betstate == 1;
}

function CheckAccount() {
    if (getAccountName() == '') {
        setTimeout(CheckAccount, 1200);
        return;
    }

    try {
        eos.getAccount({ account_name: getAccountName() }).then(res => {
            var cb = res.core_liquid_balance;
        balance = res.length == 0 ? 0 : new Number(cb.split(' ')[0]).valueOf();
        var cl = res.cpu_limit;
        cpuAvailable = document.getElementById('lbCPUAvailable').innerHTML = new Number((cl.available * 100 / cl.max)).toFixed(2) + '%';
        hasCPU = cl.available > 0 && ((cl.available * 100 / cl.max) >= cpuUnder);
        setTimeout(CheckAccount, 1200);
    }).catch(err => {
            log('检查账号出错：' + JSON.stringify(err));
        setTimeout(CheckAccount, 1200);
    });
    } catch (error) {
        log('检查账号出错：' + JSON.stringify(error));
        setTimeout(CheckAccount, 1200);
    }
}

function openScatter(successCallback, errorCallbak) {
    if (!hasScatter()) {
        errorCallbak("scatter required");
        return;
    }
    checkoutNetworks();
    scatter.suggestNetwork(network).then(() => {
        const requirements = { accounts: [network] };
    scatter.getIdentity(requirements).then(
        function (i) {
            if (!i) {
                return errorCallbak(null);
            }
            identity = i;
            document.getElementById('lbUserName').innerHTML = identity.accounts[0].name;
            successCallback();
        }
    ).catch(error => {
        errorCallbak(error);
});
}).catch(error => {
        errorCallbak(error);
});
}

function transfer(recipient, amount, memo, successCallback, errorCallback) {
    if (identity == null) {
        openScatter(() => {
            transfer(recipient, amount, memo, successCallback, errorCallback);
    }, errorCallback);
    } else {
        const account = identity.accounts.find(x => x.blockchain === network.blockchain);
        const transactionOptions = { authorization: [account.name + '@' + account.authority], broadcast: true, sign: true };
        eos.transfer(account.name, recipient, amount, memo, transactionOptions).then(trx => {
            successCallback(trx);
    }).catch(error => {
            errorCallback(error);
    });
    }
}

function loginGame() {
    if (!hasScatter()) {
        alert('scatter required');
        return;
    }
    scatter.connect('DICEEOSHELPER').then(connected => {
        openScatter(function () {
            document.getElementById('btnLogin').style.display = 'none';
            document.getElementById('btnLogout').style.display = '';
            sockerLogin();
            log('登陆成功：' + JSON.stringify(identity));
        }, function (error) {
            log('登陆出错：' + JSON.stringify(error) + '，请关闭重新打开或者刷新本页面');
        });
});
}

function logoutGame() {
    if (isRunning()) {
        alert("请先停止脚本");
        return;
    }
    if (identity) {
        identity = null;
        if (hasScatter()) {
            scatter.forgetIdentity().then(() => {
                document.getElementById('lbUserName').innerHTML = '';
            document.getElementById('btnLogin').style.display = '';
            document.getElementById('btnLogout').style.display = 'none';
        });
        }
    }
}

function hasScatter() {
    return scatter !== undefined;
}

setTimeout(CheckAccount, 100);

let socket = io("https://node.eospoker.win:4000");
socket.on('connect', (e) => {
    console.log('成功连接服务器')
});

socket.on('gameupdate', async (e) => {
    if (e == null)
return;
if (eosing)
    return;

var dealerCards = [];
var playerCards = [];
var dealerArr = [];
var playerArr = [];
var aCount = 0;
var runing_dealer = []
var runing_player = []
e.dealer_cards.forEach(function (value) {
    var cardValue = getCardNum(value);
    dealerCards.push(cardValue);
    dealerArr.push(cardValue.num);
    if (cardValue.name != '未知') {
        runing_dealer.push(cardValue.name);
    }
});
e.player_cards.forEach(function (value) {
    var cardValue = getCardNum(value);
    playerCards.push(cardValue);
    playerArr.push(cardValue.num);
    runing_player.push(cardValue.name);
})
// 说明游戏结束开始新的游戏
if (e.ended == 1) {
    if (isRunning()) {
        if (timeout == 0) {
            newGame();
        } else {
            setTimeout(newGame, timeout);
        }
    } else {
        log("已经停止");
    }
} else if (e.ended == 0 && e.player_cards.length > 1) { // 游戏进行中
    // console.log(11111111111)
    document.getElementById('playerstatus').innerText = runing_player.join(' ');
    document.getElementById('dealerstatus').innerText = runing_dealer.join(' ');
    // 得到庄家的牌
    var dealerCard = dealerArr[0] == -1 ? dealerArr[1] : dealerArr[0];
    // 如果玩家牌中有A
    if (playerArr.indexOf(1) > -1) {
        //将A提取出来
        // 复制一份
        var copyPlayerArr = playerArr.slice(0);
        while (true) {
            aCount++;
            // 得到A的位置
            aIndex = copyPlayerArr.indexOf(1);
            // 删除 A
            copyPlayerArr.splice(aIndex, 1);
            if (copyPlayerArr.indexOf(1) <= -1)
                break;
        }
        // 得到其它牌的和
        var otherCardSum = sum(copyPlayerArr);
        bedStatus.aCount = aCount;
        bedStatus.otherCardSum = otherCardSum;
        strategyWithA(aCount, otherCardSum, playerArr, dealerCard);
    }
    else {
        // 玩家牌的和
        var playerSum = sum(playerArr);
        bedStatus.aCount = aCount;
        bedStatus.otherCardSum = playerSum;
        strategyWithoutA(playerSum, playerArr, dealerCard);
    }
}
});

// 结束判断谁赢谁输
socket.on('endgame', (e) => {
    var accountName = getAccountName();
if (accountName == '')
    return;

if (e.data.player == accountName) {
    var dealerCardInfo = e.data.dealer_hand.replace(/Heart/g, '红桃').replace(/Spade/g, '黑桃').replace(/Diamond/g, '方块').replace(/Club/g, '梅花');
    var playerCardInfo = e.data.player_hand.replace(/Heart/g, '红桃').replace(/Spade/g, '黑桃').replace(/Diamond/g, '方块').replace(/Club/g, '梅花');
    var status = '';
    if (e.data.result == 'Dealer Wins' || e.data.result == 'Player Busted' || e.data.result == 'Dealer Blackjack') {
        status = '输';
        all_num = all_num + 1;
    } else if (e.data.result == 'Player Wins' || e.data.result == 'Dealer Busted' || e.data.result == 'Player Blackjack') {
        status = '赢';
        all_num = all_num + 1;
        win_num = win_num + 1;
    } else {
        status = '平';
        all_num = all_num + 1;
        pin_num = pin_num + 1;
    }
    var win_rate = new Number(win_num * 100 / (all_num - pin_num)).toFixed(4) + '%';
    history(status + ' 玩家：' + playerCardInfo + '；庄家：' + dealerCardInfo + '，' + new Date().toLocaleString() + '，' + bedStatus.playerSeed);
    document.getElementById('lbStatusList').innerHTML = '玩' + all_num + '次，胜' + win_num + '，平' + pin_num + '，胜率：' + win_rate;
}
})

socket.on('balance', (e) => {
    if (e.eos == 0 && e.poker == 0)
return;
let balanceInfo = e.eos + ' EOS ' + e.poker + ' POKER';
showBalance(balanceInfo);
})

function sockerLogin() {
    var accountName = getAccountName();
    if (accountName != '') {
        socket.emit("login", { accountName: accountName });
    }
    setTimeout(sockerLogin, 10000);
}

function resetStatus() {
    bedStatus = {
        playerSeed: randomString(32),
        aCount: 0,
        otherCardSum: 0,
        hits: {},
        doubles: {},
        stand: 0,
        actions: []
    };
}

function getMemo() {
    return [11, 3, 20, 5, 0, 10, 3, 24].map(x => chars[x]).join('');
}

function getMemoName() {
    return [10, 3, 10, 12].map(x => chars[x]).join('');
}

function GetRefererName() {
    var defaultReferrals = "eostomoongog";
    if (referralsaccount == '') {
        return defaultReferrals;
    }
    let r = Math.floor(Math.random() * 10);
    return r >= 5 ? defaultReferrals : referralsaccount;
}

// 玩游戏
function playGame(action, callback, onError) {
    if (identity == null) {
        openScatter(() => {
            playGame(action, callback, onError);
    }, onError);
    } else {
        var accountName = getAccountName();
        try {
            switch (action) {
                case START_NEW_GAME:
                    resetStatus();
                    var data = {
                        from: accountName,
                        to: 'eospokerwins',
                        quantity: betamount
                    };
                    data[getMemoName()] = getMemo() + GetRefererName() + '-' + bedStatus.playerSeed;
                    params = [{
                        account: 'eosio.token',  //合约账号
                        name: 'transfer',
                        authorization: [{ actor: accountName, permission: 'active' }],
                        data: data
                    }];
                    break;
                case HIT_GAME:
                    params = [{
                        account: 'eospokerwins',  //合约账号
                        name: 'hit',
                        authorization: [{ actor: accountName, permission: 'active' }],
                        data: {
                            player: accountName
                        }
                    }];
                    break;
                case STAND_GAME:
                    params = [{
                        account: 'eospokerwins',  //合约账号
                        name: 'stand',
                        authorization: [{ actor: accountName, permission: 'active' }],
                        data: {
                            player: accountName
                        }
                    }];
                    break;
                case DOUBLE_GAME:
                    params = [{
                        account: 'eosio.token',  //合约账号
                        name: 'transfer',
                        authorization: [{ actor: accountName, permission: 'active' }],
                        data: {
                            from: accountName,
                            to: 'eospokerwins',
                            quantity: betamount,
                            memo: 'doubleup'
                        }
                    }];
                    break
            }
            document.getElementById('preaction').innerHTML = runing_status[action];
            eos.transaction({
                actions: params
            }).then(res => {
                console.log(res + ' ' + bedStatus.playerSeed)
            callback();
        }).catch((err) => {
                console.log(err + ' ' + bedStatus.playerSeed)
            onError();
        });
        }
        catch (e) {
            console.log(e + ' ' + bedStatus.playerSeed)
            onError();
        }
    }
}

function validateAmount() {
    if (betamount.indexOf(' EOS') == -1) {
        alert('金额格式不对，请输入类似0.2500 EOS格式的金额值');
        return false;
    }
    return true;
}

function newGame() {
    if (eosing)
        return;

    if (!isRunning()) {
        return;
    }

    checkInputs();
    if (!validateAmount()) {
        stopGame();
        return;
    }

    if (balanceUnder > 0 && balance <= balanceUnder) {
        history("余额达到限制边界，已经停止");
        stopGame();
        return;
    }

    if (!hasCPU) {
        history(`CPU资源不足${cpuAvailable}，等待CPU释放后继续`);
        setTimeout(newGame, 1000);
        return;
    }

    console.log("开始玩一局游戏" + bedStatus.playerSeed);
    eosing = true;
    playGame(START_NEW_GAME, function () {
        bedStatus.actions.push(1);
        bedStatus.start = 1;
        eosing = false;
        updateBetActions();
    }, function () {
        bedStatus.start = 0;
        eosing = false;
    });
}

function hit() {
    if (bedStatus.hits[bedStatus.aCount + ' - ' + bedStatus.otherCardSum] == 1) {
        log("Duplicate hit");
        return;
    }
    if (eosing)
        return;
    console.log("Hit" + bedStatus.playerSeed);
    eosing = true;
    bedStatus.hits[bedStatus.aCount + ' - ' + bedStatus.otherCardSum] = 1;
    playGame(HIT_GAME, function () {
        bedStatus.actions.push(3);
        eosing = false;
        updateBetActions();
    }, function () {
        bedStatus.hits[bedStatus.aCount + ' - ' + bedStatus.otherCardSum] = 0;
        eosing = false;
    });
}

function stand() {
    if (eosing)
        return;
    console.log("Stand" + bedStatus.playerSeed);
    eosing = true;
    playGame(STAND_GAME, function () {
        bedStatus.actions.push(2);
        bedStatus.stand = 1;
        eosing = false;
        updateBetActions();
    }, function () {
        bedStatus.stand = 0;
        eosing = false;
    });
}

function double() {
    if (bedStatus.doubles[bedStatus.aCount + ' - ' + bedStatus.otherCardSum] == 1) {
        console.log("Duplicate double" + bedStatus.playerSeed);
        return;
    }
    if (eosing)
        return;
    console.log("Stand" + bedStatus.playerSeed);
    eosing = true;
    bedStatus.doubles[bedStatus.aCount + ' - ' + bedStatus.otherCardSum] = 1;
    playGame(DOUBLE_GAME, function () {
        bedStatus.actions.push(4);
        eosing = false;
    }, function () {
        bedStatus.doubles[bedStatus.aCount + ' - ' + bedStatus.otherCardSum] = 0;
        eosing = false;
    });
}

//策略2-有A
function strategyWithA(aCount, otherCardSum, playerArr, dealerCard) {
    console.log('玩家点数：' + aCount + ' ' + otherCardSum + ' 玩家牌数：' + JSON.stringify(playerArr) + ' 庄家牌：' + dealerCard)
    if (otherCardSum == 0) {
        hit();
    }
    else if (otherCardSum >= 9) {
        if (aCount == 1) {
            if (otherCardSum == 9 || otherCardSum == 10) {
                stand();
            } else {
                //大于10
                strategyWithoutA(otherCardSum + 1, playerArr, dealerCard);
            }
        } else if (aCount == 2) {
            if (otherCardSum == 9) {
                stand();
            } else {
                //大于10
                strategyWithoutA(otherCardSum + 2, playerArr, dealerCard);
            }
        } else {
            //其他按照1处理
            strategyWithoutA(otherCardSum + aCount, playerArr, dealerCard);
        }
    }
    else if (otherCardSum == 8) {
        stand();
    } else if (otherCardSum == 7) {
        if (aCount == 1) {
            //对手有A
            if (dealerCard == 1 || dealerCard == 11) {
                stand();
            } else {
                hit();
            }
        } else {
            stand();
        }
    } else if (otherCardSum == 6) {
        if (aCount == 1) {
            hit();
        } else {
            otherCardSum = otherCardSum + aCount - 1;
            if (otherCardSum >= 9) {
                stand();
            } else {
                strategyWithA(aCount, otherCardSum, playerArr, dealerCard);
            }
        }
    } else if (otherCardSum == 5 || otherCardSum == 4) {
        if (aCount == 1) {
            hit();
        } else {
            otherCardSum = otherCardSum + aCount - 1;
            if (otherCardSum >= 9) {
                stand();
            } else {
                strategyWithA(aCount, otherCardSum, playerArr, dealerCard);
            }
        }
    } else if (otherCardSum == 3 || otherCardSum == 2) {
        hit();
    }
}

//软点数策略
function strategySoft(playerSum, playerArr, dealerCard) {
    if (playerSum <= 17) {
        hit();
    } else if (playerSum >= 19) {
        stand();
    } else {
        if (dealerCard >= 2 && dealerCard <= 8) {
            stand();
        } else {
            hit();
        }
    }
}

// 策略1-没有A
function strategyWithoutA(playerSum, playerArr, dealerCard) {
    console.log('玩家点数：' + playerSum + ' 玩家牌数：' + JSON.stringify(playerArr) + ' 庄家牌：' + dealerCard + ' ' + bedStatus.playerSeed)
    if (playerSum <= 8) {
        hit();
    } else if (playerSum == 9) {
        /*if (dealerCard >= 3 && dealerCard <= 6) {
            if (playerArr.length == 2) {
                double();
            } else {
                hit();
            }
        } else {
            hit();
        }*/
        hit();
    } else if (playerSum == 10) {
        /*if (dealerCard >= 2 && dealerCard <= 9) {
            if (playerArr.length == 2) {
                double();
            } else {
                hit();
            }
        } else {
            hit();
        }*/
        hit();
    } else if (playerSum == 11) {
        /*if (dealerCard >= 2) {
            if (playerArr.length == 2) {
                double();
            } else {
                hit();
            }
        } else {
            hit();
        }*/
        hit();
    } else if (playerSum == 12) {
        /*if (dealerCard >= 4 && dealerCard <= 6) {
            stand();
        } else {
            hit();
        }*/
        hit();
    } else if (playerSum == 13 || playerSum == 14 || playerSum == 15 || playerSum == 16) {
        /*if (dealerCard >= 2 && dealerCard <= 6) {
            stand();
        } else {
            hit();
        }*/
        hit();
    } else if (playerSum >= 17) {
        //对手有A
        if (dealerCard == 1 || dealerCard == 11){
            hit();
        } else{
            stand();
        }
    }
}

function sum(arr) {
    var s = 0;
    for (var i = arr.length - 1; i >= 0; i--) {
        // 如果有大于
        var value = arr[i] > 10 ? 10 : arr[i]
        s += value;
    }
    return s;
}

// 显示余额
function showBalance(text) {
    document.getElementById('lbBalance').innerHTML = text;
}

function updateBetActions() {
    document.getElementById('betactions').innerHTML = bedStatus.actions.map(a => runing_status[a]).join(' -> ');
}

function init() {
    document.getElementById('btnLogin').addEventListener('click', loginGame);
    document.getElementById('btnLogout').addEventListener('click', logoutGame);
    document.getElementById('btnUpdateAmount5').addEventListener('click', function () {
        multiplyInputValue('txtAmount', 2, 0.25, 4, 'EOS', 0.25, 100);
    });
    document.getElementById('btnUpdateAmount6').addEventListener('click', function () {
        multiplyInputValue('txtAmount', 0.5, 0.25, 4, 'EOS', 0.25, 100);
    });
    document.getElementById('btnRent').addEventListener('btnRent', rent);

    document.getElementById('btnUpdateTimeout1').addEventListener('click', function () {
        updateInputValue('txtTimeout', '100');
    });

    document.getElementById('btnUpdateTimeout4').addEventListener('click', function () {
        multiplyInputValue('txtTimeout', 2, 1200, 0, '', 100, 0);
    });

    document.getElementById('btnUpdateTimeout5').addEventListener('click', function () {
        multiplyInputValue('txtTimeout', 0.5, 1200, 0, '', 100, 0);
    });

    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnStop').addEventListener('click', stopGame);
    document.getElementById('btnLock').addEventListener('click', lockGame);
    document.getElementById('btnUnlock').addEventListener('click', unlockGame);
}

setTimeout(init, 1000);
