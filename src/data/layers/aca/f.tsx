import Spacer from "components/layout/Spacer.vue";
import { createLayerTreeNode, createResetButton } from "data/common";
import { main } from "data/projEntry";
import { createClickable } from "features/clickables/clickable";
import { createPolynomialScaling, createIndependentConversion } from "features/conversion";
import { jsx } from "features/feature";
import { createInfobox } from "features/infoboxes/infobox";
import { createParticles } from "features/particles/particles";
import { createReset } from "features/reset";
import MainDisplay from "features/resources/MainDisplay.vue";
import { createResource, displayResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import { createMultiplicativeModifier } from "game/modifiers";
import { persistent } from "game/persistence";
import Decimal, { DecimalSource, formatWhole } from "util/bignum";
import { render, renderRow } from "util/vue";
import { ref } from "vue";
import c from "./c";
import confetti from "./confetti.json";

const id = "f";
const layer = createLayer(id, () => {
    const color = "#FE0102";
    const name = "Farms";
    const points = createResource<DecimalSource>(0, "farm points");
    const boop = persistent<boolean>(false);

    const coolInfo = createInfobox(() => ({
        title: "Lore",
        titleStyle: { color: "#FE0000" },
        display: "DEEP LORE!",
        bodyStyle: { backgroundColor: "#0000EE" }
    }));

    const clickableState = persistent<string>("Start");
    const clickable = createClickable(() => ({
        display() {
            return {
                title: "Clicky clicky!",
                description: "Current state:<br>" + clickableState.value
            };
        },
        initialState: "Start",
        canClick() {
            return clickableState.value !== "Borkened...";
        },
        onClick(e) {
            switch (clickableState.value) {
                case "Start":
                    clickableState.value = "A new state!";
                    break;
                case "A new state!":
                    clickableState.value = "Keep going!";
                    break;
                case "Keep going!":
                    clickableState.value = "Maybe that's a bit too far...";
                    break;
                case "Maybe that's a bit too far...":
                    const pos = e == undefined ? undefined : "touches" in e ? e.touches[0] : e;
                    const confettiParticles = Object.assign({}, confetti, {
                        pos: {
                            x: (pos?.clientX ?? 0) - (particles.boundingRect?.value?.left ?? 0),
                            y: (pos?.clientY ?? 0) - (particles.boundingRect?.value?.top ?? 0)
                        }
                    });
                    particles.addEmitter(confettiParticles).then(e => e.playOnceAndDestroy());
                    clickableState.value = "Borkened...";
                    break;
                default:
                    clickableState.value = "Start";
                    break;
            }
        },
        onHold() {
            console.log("Clickkkkk...");
        },
        style() {
            switch (clickableState.value) {
                case "Start":
                    return { "background-color": "green" };
                case "A new state!":
                    return { "background-color": "yellow" };
                case "Keep going!":
                    return { "background-color": "orange" };
                case "Maybe that's a bit too far...":
                    return { "background-color": "red" };
                default:
                    return {};
            }
        }
    }));

    const resetClickable = createClickable(() => ({
        onClick() {
            if (clickableState.value == "Borkened...") {
                clickableState.value = "Start";
            }
        },
        display() {
            return clickableState.value == "Borkened..." ? "Fix the clickable!" : "Does nothing";
        },
        small: true
    }));

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [layer]
    }));

    const conversion = createIndependentConversion(() => ({
        scaling: createPolynomialScaling(10, 0.5),
        baseResource: main.points,
        gainResource: points,
        modifyGainAmount: createMultiplicativeModifier(c.otherThingy)
    }));

    const treeNode = createLayerTreeNode(() => ({
        layerID: id,
        color,
        reset,
        tooltip() {
            if (treeNode.canClick.value) {
                return `${displayResource(points)} ${points.displayName}`;
            }
            return `This weird farmer dinosaur will only see you if you have at least 10 points. You only have ${displayResource(
                main.points
            )}`;
        },
        canClick() {
            return Decimal.gte(main.points.value, 10);
        }
    }));

    const resetButton = createResetButton(() => ({
        conversion,
        tree: main.tree,
        treeNode,
        display: jsx(() => {
            if (resetButton.conversion.buyMax) {
                return (
                    <span>
                        Hi! I'm a <u>weird dinosaur</u> and I'll give you{" "}
                        <b>{formatWhole(resetButton.conversion.currentGain.value)}</b> Farm Points
                        in exchange for all of your points and lollipops! (You'll get another one at{" "}
                        {formatWhole(resetButton.conversion.nextAt.value)} points)
                    </span>
                );
            } else {
                return (
                    <span>
                        Hi! I'm a <u>weird dinosaur</u> and I'll give you a Farm Point in exchange
                        for all of your points and lollipops! (At least{" "}
                        {formatWhole(resetButton.conversion.nextAt.value)} points)
                    </span>
                );
            }
        })
    }));

    const particles = createParticles(() => ({
        boundingRect: ref<null | DOMRect>(null),
        onContainerResized(boundingRect) {
            this.boundingRect.value = boundingRect;
        },
        style: "z-index: 2"
    }));

    const tab = jsx(() => (
        <>
            {render(coolInfo)}
            <MainDisplay resource={points} color={color} />
            {render(resetButton)}
            <div>You have {formatWhole(conversion.baseResource.value)} points</div>
            <div>
                <br />
                <img src="https://images.beano.com/store/24ab3094eb95e5373bca1ccd6f330d4406db8d1f517fc4170b32e146f80d?auto=compress%2Cformat&dpr=1&w=390" />
                <div>Bork Bork!</div>
            </div>
            <Spacer />
            {renderRow(resetClickable)}
            {renderRow(clickable)}
            {render(particles)}
        </>
    ));

    return {
        id,
        color,
        name,
        points,
        boop,
        coolInfo,
        clickable,
        clickableState,
        reset,
        conversion,
        treeNode,
        resetButton,
        display: tab
    };
});

export default layer;
