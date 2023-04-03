import Profectus from "components/Profectus.vue";
import Spacer from "components/layout/Spacer.vue";
import { jsx } from "features/feature";
import { createResource, trackBest, trackOOMPS, trackTotal } from "features/resources/resource";
import { globalBus } from "game/events";
import type { BaseLayer, GenericLayer } from "game/layers";
import { setupLayerModal } from "game/layers";
import { createLayer } from "game/layers";
import player from "game/player";
import type { DecimalSource } from "util/bignum";
import Decimal, { format, formatTime } from "util/bignum";
import { render } from "util/vue";
import { computed, toRaw } from "vue";
import a from "./layers/aca/a";
import c from "./layers/aca/c";
import f from "./layers/aca/f";
import { Player } from "game/player";
import { createTree, GenericTree, branchedResetPropagation } from "features/trees/tree";

/**
 * @hidden
 */
export const main = createLayer("main", function (this: BaseLayer) {
    const points = createResource<DecimalSource>(10);
    const best = trackBest(points);
    const total = trackTotal(points);

    const pointGain = computed(() => {
        if (!c.generatorUpgrade.bought.value) return new Decimal(0);
        let gain = new Decimal(3.19);
        if (c.lollipopMultiplierUpgrade.bought.value)
            gain = gain.times(c.lollipopMultiplierEffect.value);
        return gain;
    });
    globalBus.on("update", diff => {
        points.value = Decimal.add(points.value, Decimal.times(pointGain.value, diff));
    });
    const oomps = trackOOMPS(points, pointGain);

    const { openModal, modal } = setupLayerModal(a);

    // Note: Casting as generic tree to avoid recursive type definitions
    const tree = createTree(() => ({
        nodes: [[c.treeNode], [f.treeNode, c.spook]],
        leftSideNodes: [a.treeNode, c.h],
        branches: [
            {
                startNode: f.treeNode,
                endNode: c.treeNode,
                stroke: "blue",
                "stroke-width": "25px",
                style: {
                    filter: "blur(5px)"
                }
            }
        ],
        onReset() {
            points.value = toRaw(this.resettingNode.value) === toRaw(c.treeNode) ? 0 : 10;
            best.value = points.value;
            total.value = points.value;
        },
        resetPropagation: branchedResetPropagation
    })) as GenericTree;

    // Note: layers don't _need_ a reference to everything,
    //  but I'd recommend it over trying to remember what does and doesn't need to be included.
    // Officially all you need are anything with persistency or that you want to access elsewhere
    return {
        name: "Tree",
        display: jsx(() => (
            <>
                {player.devSpeed === 0 ? <div>Game Paused</div> : null}
                {player.devSpeed != null && player.devSpeed != 0 && player.devSpeed !== 1 ? (
                    <div>Dev Speed: {format(player.devSpeed)}x</div>
                ) : null}
                {player.offlineTime != null && player.offlineTime != 0 ? (
                    <div>Offline Time: {formatTime(player.offlineTime)}</div>
                ) : null}
                <div>
                    {Decimal.lt(points.value, "1e1000") ? <span>You have </span> : null}
                    <h2>{format(points.value)}</h2>
                    {Decimal.lt(points.value, "1e1e6") ? <span> points</span> : null}
                </div>
                {Decimal.gt(pointGain.value, 0) ? <div>({oomps.value})</div> : null}
                <Spacer />
                <button onClick={openModal}>open achievements</button>
                {render(modal)}
                {render(tree)}
                <Profectus height="200px" style="margin: 10px auto; display: block" />
            </>
        )),
        points,
        best,
        total,
        oomps,
        tree,
        showAchievements: openModal
    };
});

/**
 * Given a player save data object being loaded, return a list of layers that should currently be enabled.
 * If your project does not use dynamic layers, this should just return all layers.
 */
export const getInitialLayers = (
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    player: Partial<Player>
): Array<GenericLayer> => [main, f, c, a];

/**
 * A computed ref whose value is true whenever the game is over.
 */
export const hasWon = computed(() => {
    return Decimal.gt(main.points.value, 25);
});

/**
 * Given a player save data object being loaded with a different version, update the save data object to match the structure of the current version.
 * @param oldVersion The version of the save being loaded in
 * @param player The save data being loaded in
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export function fixOldSave(
    oldVersion: string | undefined,
    player: Partial<Player>
    // eslint-disable-next-line @typescript-eslint/no-empty-function
): void {}
/* eslint-enable @typescript-eslint/no-unused-vars */
