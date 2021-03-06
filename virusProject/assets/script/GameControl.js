
cc.Class({
    extends: cc.Component,

    properties: {
        logo: cc.Node, // logo
        levelDesign: cc.Node, // 关卡
        m_Top: cc.Node, // 顶部
        m_setting: cc.Node, // 设置
        m_clackGet: cc.Node, // 金币
        m_bottom: cc.Node, // 底部
        m_tip: cc.Node, // 中心文字提示
        m_Bg: cc.Node, // 背景图
        m_airPlane: cc.Node, // 飞机
        m_goldPrafab: cc.Prefab, // 金币
        m_TouchControl: cc.Node, // 触摸遮罩
        m_BulletPrefab: cc.Prefab, // 子弹的Prefab
        m_MonsterHP: cc.Node, // 怪物的HP 进度条
        m_VirusMake: cc.Node, // 病毒的逻辑node
    },

    ctor() {
        console.log('父的ctor');
        this.m_ClassArray = []; // 获取的数据集合
        this.goldPool = new cc.NodePool(); // 创建金币对象池的容器
        this.bulletPool = new cc.NodePool(); // 创建子弹对象池的容器
    },
    onLoad() {
        // 开启碰撞检测
        cc.director.getCollisionManager().enabled = true;
        // cc.director.getCollisionManager().enabledDebugDraw = true;

        window.gGameCtl = this;
        console.log('父的onLoad');

        this.logo = this.logo.getComponent('Logo');
        this.m_ClassArray.push(this.logo);

        this.levelDesign = this.levelDesign.getComponent('leveDesign');
        this.levelDesign.reset();
        this.m_ClassArray.push(this.levelDesign);

        this.m_Top = this.m_Top.getComponent('Top');
        this.m_ClassArray.push(this.m_Top);

        this.m_setting = this.m_setting.getComponent('Setting');
        this.m_ClassArray.push(this.m_setting);

        this.m_clackGet = this.m_clackGet.getComponent('ClickGet');
        this.m_ClassArray.push(this.m_clackGet);

        this.m_bottom = this.m_bottom.getComponent('Bottom');
        this.m_ClassArray.push(this.m_bottom);

        this.m_tip = this.m_tip.getComponent('Tip');
        this.m_ClassArray.push(this.m_tip);

        this.m_Bg = this.m_Bg.getComponent('Bg');
        this.m_ClassArray.push(this.m_Bg);

        this.m_airPlane = this.m_airPlane.getComponent('AirAutoPlay');
        this.m_ClassArray.push(this.m_airPlane);
        window.gAirPlane = this.m_airPlane; // 全局的自动飞机

        this.m_MonsterHP = this.m_MonsterHP.getComponent('MonsterHP');
        this.m_ClassArray.push(this.m_MonsterHP);

        this.m_VirusMake = this.m_VirusMake.getComponent('VirusMask');
        this.m_ClassArray.push(this.m_VirusMake);


        this.m_ClassArray.forEach(v => v.play && v.play());

        this.scheduleOnce(() => this.m_TouchControl.active = true, 1.5); // 1.5 秒后才能点击，先完成首页的动画过度
    },
    createGoldAnim(srcPos, dstPos, radius, goldCount, addGold, callBack) { // 创建金币的动画
        /**
         * srcPos 开始位置
         * dstPos 目标位置
         * radius 圆半径
         * goldCount 产生的个数
         * addGold:需要增加多少金币
         * callBack:动画结束回调
         */
        let arr = this.getPoint(radius, srcPos.x, srcPos.y, goldCount);
        let nodeArr = [];

        arr.forEach(v => {
            let gold = this.createGold(this.node); // 使用金币对象池
            // 随机位置
            let randPos = cc.v2(v.x + random(0, 50), v.y + random(0, 50));
            gold.setPosition(srcPos);
            nodeArr.push({ gold, randPos })

        });
        // 根据两点的距离排序 距离近的先到目标点
        nodeArr.sort((a, b) => {
            let disa = distance(a.randPos, dstPos);
            let disb = distance(b.randPos, dstPos);
            return disa - disb
        })
        let notPlay = false; // 是否金币动画放大播放结束
        let targetGoldNode = this.m_Top.getGoldNode(); // 获取顶部的金币node

        nodeArr.forEach((v, i) => {
            let seq = cc.sequence(
                cc.moveTo(0.3, v.randPos),
                cc.delayTime(i * 0.02), // 距离越远的越靠后运动
                cc.moveTo(0.3, dstPos),
                cc.callFunc((v) => {
                    cc.sys.localStorage.q = 123
                    if (!notPlay) {
                        notPlay = true;
                        let seq = cc.sequence(
                            cc.scaleTo(0.1, 0.8, 0.8),
                            cc.scaleTo(0.1, 0.5, 0.5),
                            cc.callFunc(() => notPlay = false) // 金币动画放大结束
                        )
                        targetGoldNode.runAction(seq);
                    }
                    if (i == nodeArr.length - 1) {
                        if (callBack != null) callBack(addGold);
                    }
                    this.onGoldKilled(v)
                })
            )
            v.gold.parent = this.node; // 挂载到父节点 同 this.node.addChild(v.gold)
            v.gold.runAction(seq)
        });

    },
    createGold(parentNode) { // 制造对象池
        let enemy = null;
        if (this.goldPool.size() > 0) { // 通过 size 接口判断对象池中是否有空闲的对象
            enemy = this.goldPool.get();
        } else { // 如果没有空闲对象，也就是对象池中备用对象不够时，我们就用 cc.instantiate 重新创建
            enemy = cc.instantiate(this.m_goldPrafab);
        }
        enemy.parent = parentNode; // 将生成的敌人加入节点树
        return enemy
        // enemy.getComponent('Enemy').init(); //接下来就可以调用 enemy 身上的脚本进行初始化
    },
    onGoldKilled(gold) { // 返回到对象池
        // enemy 应该是一个 cc.Node
        this.goldPool.put(gold); // 和初始化时的方法一样，将节点放进对象池，这个方法会同时调用节点的 removeFromParent
    },
    createBullte(count) { // 创建子弹对象池
        /**
         * count 创建几个子弹
         */
        if (count <= 1) {
            let bullteNode = null;
            if (this.bulletPool.size() > 0) { // 通过 size 接口判断对象池中是否有空闲的对象
                bullteNode = this.bulletPool.get();
            } else { // 如果没有空闲对象，也就是对象池中备用对象不够时，我们就用 cc.instantiate 重新创建
                bullteNode = cc.instantiate(this.m_BulletPrefab);
            }
            bullteNode.parent = this.node; // 创建到canvas上
            let pos = this.m_airPlane.node.getPosition();
            pos.y += 116;
            bullteNode.setPosition(pos);
            // pos.y += 100;
            let js = bullteNode.getComponent('Bullet');
            js.init();
            js.setSecondPos(cc.v2(pos.x, pos.y + 80));
        } else { // 多个子弹时的位置显示
            let left = 1; // 左边显示几个子弹
            let right = 1;// 右边显示几个子弹
            let imgSize = 30; // 图片的宽度
            for (let i = 0; i < count; i++) {
                let ofset = 0;
                if (count % 2 != 0) { // 子弹为奇数时，设置第一个为0
                    if (i == 0) {
                        ofset = 0;
                    } else if (i % 2) {
                        ofset = -imgSize * left; // 左边的图片宽度
                        ofset += imgSize / 2 - 15;
                        left++;
                    } else {
                        ofset = imgSize * right; // 右边子弹总宽度
                        ofset -= imgSize / 2 - 15; // 向左偏移半个子弹的距离 多减去15为第一个子弹宽度的一半
                        right++;
                    }
                } else {
                    if (i % 2) {
                        ofset = -imgSize * left; // 左边的图片宽度
                        ofset += imgSize / 2;
                        left++;
                    } else {
                        ofset = imgSize * right; // 右边子弹总宽度
                        ofset -= imgSize / 2; // 向左偏移半个子弹的距离
                        right++;
                    }
                }
                let bullteNode = null;
                if (this.bulletPool.size() > 0) { // 通过 size 接口判断对象池中是否有空闲的对象
                    bullteNode = this.bulletPool.get();
                } else { // 如果没有空闲对象，也就是对象池中备用对象不够时，我们就用 cc.instantiate 重新创建
                    bullteNode = cc.instantiate(this.m_BulletPrefab);
                }
                bullteNode.parent = this.node; // 创建到canvas上
                let pos = this.m_airPlane.node.getPosition();
                pos.y += 116;
                bullteNode.setPosition(pos);
                let js = bullteNode.getComponent('Bullet');
                js.init();
                js.setSecondPos(cc.v2(pos.x + ofset, pos.y + 80));
            }
        }
    },
    onBullteKilled(bullte) { // 返回到对象池
        this.bulletPool.put(bullte); // 和初始化时的方法一样，将节点放进对象池，这个方法会同时调用节点的 removeFromParent
    },
    getPoint(r, ox, oy, count) {
        /**
        * 求圆周上等分点的坐标
        * ox,oy为圆心坐标
        * r为半径
        * count为等分个数
        */
        var point = []; //结果
        var radians = (Math.PI / 180) * Math.round(360 / count), //弧度
            i = 0;
        for (; i < count; i++) {
            var x = ox + r * Math.sin(radians * i),
                y = oy + r * Math.cos(radians * i);

            point.unshift({ x: x, y: y }); //为保持数据顺时针
        }
        return point;
    },
    Action(action) { // 开始飞机动画的一些方法
        if (action == ACTION_RESET) {
            this.ActionReset();
        } else if (action == ACTION_PLAY) {
            this.ActionPlay();
        } else if (action == ACTION_MOVE_OUT) {
            this.ActionMoveOut();
        } else if (action == ACTION_MOVE_IN) {
            this.ActionMoveIn();
        }
    },
    ActionReset() { // 重置
        this.m_ClassArray.forEach(v => v.reset && v.reset());
    },
    ActionPlay() { // 开始播放 
        this.m_ClassArray.forEach(v => v.play && v.play());
    },
    ActionMoveOut() { // 移出
        this.m_ClassArray.forEach(v => v.moveOut && v.moveOut());
    },
    ActionMoveIn() { // 移入
        this.m_ClassArray.forEach(v => v.moveIn && v.moveIn());
    },
    moveAirPlane(pos) { // 移动飞机的位置
        let slefPos = this.m_airPlane.node.getPosition();
        this.m_airPlane.node.setPosition(cc.v2(slefPos.x + pos.x, slefPos.y + pos.y))
    },
    test(target, data) {
        if (data == '重置') {
            // window.gDataCtl.AddGold(999);
            // this.m_Top.updateData();
            window.gDataCtl.del()
        }
        this.m_ClassArray.forEach(v => {
            if (data == '重置') v.reset && v.reset()
            if (data == '播放') v.play && v.play()
            if (data == '移出') v.moveOut && v.moveOut()
            if (data == '移入') v.moveIn && v.moveIn()
        });
    },
    start() {
        console.log('父的start');
    },

    // update (dt) {},
});
