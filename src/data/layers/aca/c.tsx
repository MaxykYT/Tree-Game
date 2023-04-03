import Modal from "components/Modal.vue";
import Slider from "components/fields/Slider.vue";
import Text from "components/fields/Text.vue";
import Toggle from "components/fields/Toggle.vue";
import Column from "components/layout/Column.vue";
import Row from "components/layout/Row.vue";
import Spacer from "components/layout/Spacer.vue";
import Sticky from "components/layout/Sticky.vue";
import VerticalRule from "components/layout/VerticalRule.vue";
import { createLayerTreeNode, createResetButton, modifierToFormula } from "data/common";
import { main } from "data/projEntry";
import themes from "data/themes";
import { createBar } from "features/bars/bar";
import { createChallenge } from "features/challenges/challenge";
import { createClickable } from "features/clickables/clickable";
import { createCumulativeConversion } from "features/conversion";
import { Visibility, jsx } from "features/feature";
import { createHotkey } from "features/hotkey";
import { createInfobox } from "features/infoboxes/infobox";
import { createLinks } from "features/links/links";
import { createRepeatable } from "features/repeatable";
import { createReset } from "features/reset";
import MainDisplay from "features/resources/MainDisplay.vue";
import Resource from "features/resources/Resource.vue";
import { createResource, displayResource, trackBest } from "features/resources/resource";
import { createTab } from "features/tabs/tab";
import { GenericTabFamily, createTabFamily } from "features/tabs/tabFamily";
import { addTooltip } from "features/tooltips/tooltip";
import {
    GenericTreeNode,
    TreeBranch,
    createResourceTooltip,
    createTree,
    createTreeNode
} from "features/trees/tree";
import { createUpgrade } from "features/upgrades/upgrade";
import { createLayer } from "game/layers";
import {
    createAdditiveModifier,
    createExponentialModifier,
    createModifierSection,
    createSequentialModifier
} from "game/modifiers";
import { noPersist, persistent } from "game/persistence";
import { createBooleanRequirement, createCostRequirement } from "game/requirements";
import settings from "game/settings";
import { DecimalSource } from "lib/break_eternity";
import Decimal, { format, formatWhole } from "util/bignum";
import { Direction } from "util/common";
import { render, renderCol, renderRow } from "util/vue";
import { ComputedRef, Ref, computed, ref, unref } from "vue";
import f from "./f";
import { ProcessedComputable } from "util/computed";
import { createAchievement } from "features/achievements/achievement";

const id = "c";
const layer = createLayer(id, () => {
    const color = "#4BDC13";
    const name = "Candies";
    const points = createResource<DecimalSource>(0, "lollipops");
    const best = trackBest(points);
    const beep = persistent<boolean>(false);
    const thingy = persistent<string>("pointy");
    const otherThingy = persistent<number>(10);
    const spentOnBuyables = persistent(new Decimal(10));

    const waffleBoost = computed(() => Decimal.pow(points.value, 0.2));
    const icecreamCap = computed(() => Decimal.times(points.value, 10));

    const coolInfo = createInfobox(() => ({
        title: "Lore",
        titleStyle: { color: "#FE0000" },
        display: "DEEP LORE!",
        bodyStyle: { backgroundColor: "#0000EE" },
        color: "rgb(75, 220, 19)"
    }));

    const lollipopMilestone3 = createAchievement(() => ({
        requirements: createBooleanRequirement(() => Decimal.gte(best.value, 3)),
        display: {
            requirement: "3 Lollipops",
            effectDisplay: "Unlock the next milestone"
        }
    }));
    const lollipopMilestone4 = createAchievement(() => ({
        visibility: lollipopMilestone3.earned,
        requirements: createBooleanRequirement(() => Decimal.gte(best.value, 4)),
        display: {
            requirement: "4 Lollipops",
            effectDisplay: "You can toggle beep and boop (which do nothing)",
            optionsDisplay: jsx(() => (
                <>
                    <Toggle
                        title="beep"
                        onUpdate:modelValue={value => (beep.value = value)}
                        modelValue={beep.value}
                    />
                    <Toggle
                        title="boop"
                        onUpdate:modelValue={value => (f.boop.value = value)}
                        modelValue={f.boop.value}
                    />
                </>
            ))
        },
        style() {
            if (unref(this.earned)) {
                return { backgroundColor: "#1111DD" };
            }
            return {};
        }
    }));
    const lollipopMilestones = [lollipopMilestone3, lollipopMilestone4];

    const funChallenge = createChallenge(() => ({
        title: "Fun",
        requirements: createCostRequirement(() => ({
            resource: main.points,
            cost: 20,
            spendResources: false
        })),
        completionLimit: 3,
        display() {
            return {
                description: `Makes the game 0% harder<br>${formatWhole(this.completions.value)}/${
                    this.completionLimit
                } completions`,
                goal: "Have 20 points I guess",
                reward: "Says hi",
                effectDisplay: format(funEffect.value) + "x"
            };
        },
        visibility: () => Decimal.gt(best.value, 0),
        onComplete() {
            console.log("hiii");
        },
        onEnter() {
            main.points.value = 0;
            main.best.value = main.points.value;
            main.total.value = main.points.value;
            console.log("So challenging");
        },
        onExit() {
            console.log("Sweet freedom!");
        },
        style: {
            height: "200px"
        }
    }));
    const funEffect = computed(() => Decimal.add(points.value, 1).tetrate(0.02));

    const generatorUpgrade = createUpgrade(() => ({
        display: {
            title: "Generator of Genericness",
            description: "Gain 1 point every second"
        },
        requirements: createCostRequirement(() => ({
            cost: 1,
            resource: noPersist(points)
        }))
    }));
    const lollipopMultiplierUpgrade = createUpgrade(() => ({
        display: () => ({
            description: "Point generation is faster based on your unspent Lollipops",
            effectDisplay: `${format(lollipopMultiplierEffect.value)}x`
        }),
        requirements: createCostRequirement(() => ({
            cost: 1,
            resource: noPersist(points)
        })),
        visibility: generatorUpgrade.bought
    }));
    const lollipopMultiplierEffect = computed(() => {
        let ret = Decimal.add(points.value, 1).pow(0.5);
        if (ret.gte("1e20000000")) ret = ret.sqrt().times("1e10000000");
        return ret;
    });
    const unlockIlluminatiUpgrade = createUpgrade(() => ({
        visibility: lollipopMultiplierUpgrade.bought,
        requirements: createCostRequirement(() => ({
            cost: 7,
            resource: main.points,
            requiresPay: false
        })),
        onPurchase() {
            main.points.value = Decimal.add(main.points.value, 7);
        },
        display:
            "Only buyable with less than 7 points, and gives you 7 more. Unlocks a secret subtab.",
        style() {
            if (unref(this.bought)) {
                return { backgroundColor: "#1111dd" };
            }
            if (!unref(this.canPurchase)) {
                return { backgroundColor: "#dd1111" };
            }
            return {};
        }
    }));
    const quasiUpgrade = createUpgrade(() => ({
        requirements: createCostRequirement(() => ({
            resource: createResource(exhancers.amount, "Exhancers", 0),
            cost: 3
        })),
        display: {
            title: "This upgrade doesn't exist",
            description: "Or does it?"
        }
    }));
    const upgrades = [generatorUpgrade, lollipopMultiplierUpgrade, unlockIlluminatiUpgrade];

    const exhancersCost = createCostRequirement(() => ({
        resource: noPersist(points),
        cost() {
            let x = new Decimal(exhancers.amount.value);
            if (x.gte(25)) {
                x = x.pow(2).div(25);
            }
            const cost = Decimal.pow(2, x.pow(1.5));
            return cost.floor();
        },
        pay(amount) {
            const cost = unref(this.cost as unknown as ProcessedComputable<DecimalSource>);
            spentOnBuyables.value = Decimal.add(spentOnBuyables.value, cost ?? 0);
            this.resource.value = Decimal.sub(this.resource.value, cost).max(0);
        }
    }));
    const exhancers = createRepeatable(() => ({
        requirements: exhancersCost,
        display() {
            return {
                title: "Exhancers",
                description: `Adds ${format(
                    thingEffect.value
                )} things and multiplies stuff by ${format(stuffEffect.value)}.`
            };
        },
        style: { height: "222px" },
        purchaseLimit: 4
    }));
    // The following need redundant ComputedRef<Decimal> type annotations because otherwise the ts
    // interpreter thinks exhancers are cyclically referenced
    const thingEffect: ComputedRef<Decimal> = computed(() => {
        if (Decimal.gte(exhancers.amount.value, 0)) {
            return Decimal.pow(25, Decimal.pow(exhancers.amount.value, 1.1));
        }
        return Decimal.pow(1 / 25, Decimal.times(exhancers.amount.value, -1).pow(1.1));
    });
    const stuffEffect: ComputedRef<Decimal> = computed(() => {
        if (Decimal.gte(exhancers.amount.value, 0)) {
            return Decimal.pow(25, Decimal.pow(exhancers.amount.value, 1.1));
        }
        return Decimal.pow(1 / 25, Decimal.times(exhancers.amount.value, -1).pow(1.1));
    });
    const confirmRespec = persistent<boolean>(false);
    const confirming = ref(false);
    const respecBuyables = createClickable(() => ({
        small: true,
        display: "Respec Thingies",
        onClick() {
            if (confirmRespec.value && !confirming.value) {
                confirming.value = true;
                return;
            }

            points.value = Decimal.add(points.value, spentOnBuyables.value);
            exhancers.amount.value = 0;
            main.tree.reset(treeNode);
        }
    }));
    const sellExhancer = createClickable(() => ({
        small: true,
        display: "Sell One",
        onClick() {
            if (Decimal.lte(exhancers.amount.value, 0)) {
                return;
            }
            exhancers.amount.value = Decimal.sub(exhancers.amount.value, 1);
            const cost = (exhancersCost.cost as Ref<DecimalSource>).value;
            points.value = Decimal.add(points.value, cost);
            spentOnBuyables.value = Decimal.sub(spentOnBuyables.value, cost);
        }
    }));
    const buyablesDisplay = jsx(() => (
        <Column>
            <Row>
                <Toggle
                    title="Confirm"
                    onUpdate:modelValue={value => (confirmRespec.value = value)}
                    modelValue={confirmRespec.value}
                />
                {renderRow(respecBuyables)}
            </Row>
            {renderRow(exhancers)}
            {renderRow(sellExhancer)}
            <Modal
                modelValue={confirming.value}
                onUpdate:modelValue={value => (confirming.value = value)}
                v-slots={{
                    header: () => <h2>Confirm Respec</h2>,
                    body: () => <>Are you sure? Respeccing these doesn't accomplish much</>,
                    footer: () => (
                        <div class="modal-default-footer">
                            <div class="modal-default-flex-grow"></div>
                            <button
                                class="button modal-default-button"
                                onClick={() => (confirming.value = false)}
                            >
                                Cancel
                            </button>
                            <button
                                class="button modal-default-button danger"
                                onClick={() => {
                                    respecBuyables.onClick();
                                    confirming.value = false;
                                }}
                            >
                                Respec
                            </button>
                        </div>
                    )
                }}
            />
        </Column>
    ));

    const longBoi = createBar(() => ({
        fillStyle: { backgroundColor: "#FFFFFF" },
        baseStyle: { backgroundColor: "#696969" },
        textStyle: { color: "#04e050" },
        direction: Direction.Right,
        width: 300,
        height: 30,
        progress() {
            return Decimal.add(main.points.value, 1).log(10).div(10).toNumber();
        },
        display() {
            return format(main.points.value) + " / 1e10 points";
        }
    }));
    const tallBoi = createBar(() => ({
        fillStyle: { backgroundColor: "#4BEC13" },
        baseStyle: { backgroundColor: "#000000" },
        textStyle: { textShadow: "0px 0px 2px #000000" },
        borderStyle: { borderWidth: "7px" },
        direction: Direction.Up,
        width: 50,
        height: 200,
        progress() {
            return Decimal.div(main.points.value, 100);
        },
        display() {
            return formatWhole(Decimal.div(main.points.value, 1).min(100)) + "%";
        }
    }));
    const flatBoi = createBar(() => ({
        fillStyle: { backgroundColor: "#FE0102" },
        baseStyle: { backgroundColor: "#222222" },
        textStyle: { textShadow: "0px 0px 2px #000000" },
        direction: Direction.Up,
        width: 100,
        height: 30,
        progress() {
            return Decimal.div(points.value, 50);
        }
    }));

    const conversionModifier = createSequentialModifier(() => [
        createExponentialModifier(() => ({
            exponent: 2,
            description: "Because I felt like it"
        })),
        createAdditiveModifier(() => ({ addend: 1, description: "Nice modifier" }))
    ]);
    const conversion = createCumulativeConversion(() => ({
        formula: x =>
            modifierToFormula(
                conversionModifier,
                x
                    .div(10)
                    .sqrt()
                    .step(1e100, f => f.sqrt())
            ),
        baseResource: main.points,
        gainResource: noPersist(points),
        roundUpCost: true
    }));

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [layer]
    }));

    const hotkeys = [
        createHotkey(() => ({
            key: "c",
            description: "reset for lollipops or whatever",
            onPress() {
                if (resetButton.canClick.value) {
                    resetButton.onClick();
                }
            }
        })),
        createHotkey(() => ({
            key: "ctrl+c",
            description: "respec things",
            onPress() {
                respecBuyables.onClick();
            }
        }))
    ];

    const treeNode = createLayerTreeNode(() => ({
        layerID: id,
        color,
        reset,
        mark: "https://unsoftcapped2.github.io/The-Modding-Tree-2/discord.png",
        tooltip() {
            let tooltip = displayResource(points);
            if (Decimal.gt(exhancers.amount.value, 0)) {
                tooltip += `<br><i><br><br><br>${formatWhole(
                    exhancers.amount.value
                )} Exhancers</i>`;
            }
            return tooltip;
        },
        style: {
            color: "#3325CC",
            textDecoration: "underline"
        }
    }));
    const treeNodeTooltip = addTooltip(treeNode, {
        display: createResourceTooltip(points),
        pinnable: true
    });

    const resetButton = createResetButton(() => ({
        conversion,
        tree: main.tree,
        treeNode,
        style: {
            color: "#AA66AA"
        },
        resetDescription: "Melt your points into "
    }));
    const resetButtonTooltip = addTooltip(resetButton, {
        display: jsx(() =>
            createModifierSection({
                title: "Modifiers",
                modifier: conversionModifier
            })
        ),
        pinnable: true,
        direction: Direction.Down,
        style: "width: 400px; text-align: left"
    });

    const g = createTreeNode(() => ({
        display: "TH",
        color: "#6d3678",
        canClick() {
            return Decimal.gte(main.points.value, 10);
        },
        tooltip: "Thanos your points",
        onClick() {
            main.points.value = Decimal.div(main.points.value, 2);
            console.log("Thanos'd");
        },
        glowColor() {
            if (Decimal.eq(exhancers.amount.value, 1)) {
                return "orange";
            }
            return "";
        }
    }));
    const h = createTreeNode(() => ({
        display: "h",
        color() {
            return themes[settings.theme].variables["--locked"];
        },
        tooltip: {
            display: computed(() => `Restore your points to ${format(otherThingy.value)}`),
            right: true
        },
        canClick() {
            return Decimal.lt(main.points.value, otherThingy.value);
        },
        onClick() {
            main.points.value = otherThingy.value;
        }
    }));
    const spook = createTreeNode(() => ({
        visibility: Visibility.Hidden
    }));
    const tree = createTree(() => ({
        nodes(): GenericTreeNode[][] {
            return [
                [f.treeNode, treeNode],
                [g, spook, h]
            ];
        },
        branches(): TreeBranch[] {
            return [
                {
                    startNode: f.treeNode,
                    endNode: treeNode,
                    "stroke-width": "25px",
                    stroke: "green",
                    style: {
                        filter: "blur(5px)"
                    }
                },
                { startNode: treeNode, endNode: g },
                { startNode: g, endNode: h }
            ];
        }
    }));

    const links = createLinks(() => ({
        links: [
            {
                startNode: h,
                endNode: flatBoi,
                "stroke-width": "5px",
                stroke: "red",
                offsetEnd: { x: -50 + 100 * flatBoi.progress.value.toNumber(), y: 0 }
            }
        ]
    }));

    const illuminatiTabs = createTabFamily(
        {
            first: () => ({
                tab: jsx(() => (
                    <>
                        {renderRow(...upgrades)}
                        {renderRow(quasiUpgrade)}
                        <div>confirmed</div>
                    </>
                )),
                display: "first"
            }),
            second: () => ({
                tab: f.display,
                display: "second"
            })
        },
        () => ({
            style: {
                width: "660px",
                backgroundColor: "brown",
                "--background": "brown",
                border: "solid white",
                marginLeft: "auto",
                marginRight: "auto"
            }
        })
    ) as GenericTabFamily;

    const tabs = createTabFamily({
        mainTab: () => ({
            tab: createTab(() => ({
                display: jsx(() => (
                    <>
                        <MainDisplay
                            resource={points}
                            color={color}
                            effectDisplay={`which are boosting waffles by ${format(
                                waffleBoost.value
                            )} and increasing the Ice Cream cap by ${format(icecreamCap.value)}`}
                        />
                        <Sticky>{render(resetButton)}</Sticky>
                        <Resource resource={points} color={color} />
                        <Spacer height="5px" />
                        <button onClick={() => console.log("yeet")}>'HI'</button>
                        <div>Name your points!</div>
                        <Text
                            modelValue={thingy.value}
                            onUpdate:modelValue={value => (thingy.value = value)}
                        />
                        <Sticky style="color: red; font-size: 32px; font-family: Comic Sans MS;">
                            I have {displayResource(main.points)} {thingy.value} points!
                        </Sticky>
                        <hr />
                        {renderCol(...lollipopMilestones)}
                        <Spacer />
                        {renderRow(...upgrades)}
                        {renderRow(quasiUpgrade)}
                        {renderRow(funChallenge)}
                    </>
                ))
            })),
            display: "main tab",
            glowColor() {
                if (
                    generatorUpgrade.canPurchase.value ||
                    lollipopMultiplierUpgrade.canPurchase.value ||
                    unlockIlluminatiUpgrade.canPurchase.value ||
                    Decimal.gt(funChallenge.canComplete.value, 0)
                ) {
                    return "blue";
                }
                return "";
            },
            style: { color: "orange" }
        }),
        thingies: () => ({
            tab: createTab(() => ({
                style() {
                    return { backgroundColor: "#222222", "--background": "#222222" };
                },
                display: jsx(() => (
                    <>
                        {render(buyablesDisplay)}
                        <Spacer />
                        <Row style="width: 600px; height: 350px; background-color: green; border-style: solid;">
                            <Toggle
                                onUpdate:modelValue={value => (beep.value = value)}
                                modelValue={beep.value}
                            />
                            <Spacer width="30px" height="10px" />
                            <div>
                                <span>Beep</span>
                            </div>
                            <Spacer />
                            <VerticalRule height="200px" />
                        </Row>
                        <Spacer />
                        <img src="https://unsoftcapped2.github.io/The-Modding-Tree-2/discord.png" />
                    </>
                ))
            })),
            glowColor: "white",
            display: "thingies",
            style: { borderColor: "orange" }
        }),
        jail: () => ({
            tab: createTab(() => ({
                display: jsx(() => (
                    <>
                        {render(coolInfo)}
                        {render(longBoi)}
                        <Spacer />
                        <Row>
                            <Column style="background-color: #555555; padding: 15px">
                                <div style="color: teal">Sugar level:</div>
                                <Spacer />
                                {render(tallBoi)}
                            </Column>
                            <Spacer />
                            <Column>
                                <div>idk</div>
                                <Spacer width="0" height="50px" />
                                {render(flatBoi)}
                            </Column>
                        </Row>
                        <Spacer />
                        <div>It's jail because "bars"! So funny! Ha ha!</div>
                        {render(tree)}
                    </>
                ))
            })),
            display: "jail"
        }),
        illuminati: () => ({
            tab: createTab(() => ({
                display: jsx(() => (
                    // This should really just be <> and </>, however for some reason the
                    // typescript interpreter can't figure out this layer and f.tsx otherwise
                    <div>
                        <h1> C O N F I R M E D </h1>
                        <Spacer />
                        {render(illuminatiTabs)}
                        <div>Adjust how many points H gives you!</div>
                        <Slider
                            onUpdate:modelValue={value => (otherThingy.value = value)}
                            modelValue={otherThingy.value}
                            min={1}
                            max={30}
                        />
                    </div>
                )),
                style: {
                    backgroundColor: "#3325CC"
                }
            })),
            visibility: unlockIlluminatiUpgrade.bought,
            display: "illuminati"
        })
    });

    return {
        id,
        color,
        name,
        points,
        best,
        beep,
        thingy,
        otherThingy,
        spentOnBuyables,
        waffleBoost,
        icecreamCap,
        coolInfo,
        lollipopMilestones,
        funChallenge,
        funEffect,
        generatorUpgrade,
        lollipopMultiplierUpgrade,
        lollipopMultiplierEffect,
        unlockIlluminatiUpgrade,
        quasiUpgrade,
        exhancers,
        respecBuyables,
        illuminatiTabs,
        sellExhancer,
        bars: { tallBoi, longBoi, flatBoi },
        tree,
        g,
        h,
        spook,
        conversion,
        reset,
        hotkeys,
        treeNode,
        resetButton,
        confirmRespec,
        minWidth: 800,
        tabs,
        display: jsx(() => (
            <>
                {render(tabs)}
                {render(links)}
            </>
        )),
        treeNodeTooltip,
        resetButtonTooltip
    };
});

export default layer;
