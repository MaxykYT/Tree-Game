import { main } from "data/projEntry";
import { createAchievement } from "features/achievements/achievement";
import { jsx } from "features/feature";
import { createGrid } from "features/grids/grid";
import { createResource } from "features/resources/resource";
import Tooltip from "features/tooltips/Tooltip.vue";
import { addTooltip } from "features/tooltips/tooltip";
import { createTreeNode } from "features/trees/tree";
import { createLayer } from "game/layers";
import { DecimalSource } from "lib/break_eternity";
import Decimal from "util/bignum";
import { Direction } from "util/common";
import { renderRow } from "util/vue";

const id = "a";
const layer = createLayer(id, () => {
    const color = "yellow";
    const name = "Achievements";
    const points = createResource<DecimalSource>(0, "achievement power");

    const treeNode = createTreeNode(() => ({
        display: "A",
        color,
        tooltip: {
            display: "Achievements",
            right: true
        },
        onClick() {
            main.showAchievements();
        }
    }));

    const ach1 = createAchievement(() => ({
        image: "https://unsoftcapped2.github.io/The-Modding-Tree-2/discord.png",
        display: "Get me!",
        requirements: [],
        small: true
    }));
    addTooltip(ach1, {
        display() {
            if (ach1.earned.value) {
                return "You did it!";
            }
            return "How did this happen?";
        },
        direction: Direction.Down
    });
    const ach2 = createAchievement(() => ({
        display: "Impossible!",
        style: { color: "#04e050" }
    }));
    addTooltip(ach2, {
        display() {
            if (ach2.earned.value) {
                return "HOW????";
            }
            return "Mwahahaha!";
        },
        direction: Direction.Down
    });
    const ach3 = createAchievement(() => ({
        display: "EIEIO",
        requirements: [],
        onComplete() {
            console.log("Bork bork bork!");
        },
        small: true
    }));
    addTooltip(ach3, {
        display:
            "Get a farm point.\n\nReward: The dinosaur is now your friend (you can max Farm Points).",
        direction: Direction.Down
    });
    const achievements = [ach1, ach2, ach3];

    const grid = createGrid(() => ({
        rows: 2,
        cols: 2,
        getStartState(id) {
            return id;
        },
        getStyle(id, state) {
            return { backgroundColor: `#${(Number(state) * 1234) % 999999}` };
        },
        // TODO display should return an object
        getTitle(id) {
            let direction = "";
            if (id === "101") {
                direction = "top";
            } else if (id === "102") {
                direction = "bottom";
            } else if (id === "201") {
                direction = "left";
            } else if (id === "202") {
                direction = "right";
            }
            return jsx(() => (
                <Tooltip display={JSON.stringify(this.cells[id].style)} {...{ [direction]: true }}>
                    <h3>Gridable #{id}</h3>
                </Tooltip>
            ));
        },
        getDisplay(id, state) {
            return String(state);
        },
        getCanClick() {
            return Decimal.eq(main.points.value, 10);
        },
        onClick(id, state) {
            this.cells[id].state = Number(state) + 1;
        }
    }));

    const display = jsx(() => (
        <>
            {renderRow(...achievements)}
            {renderRow(grid)}
        </>
    ));

    return {
        id,
        color,
        name,
        points,
        achievements,
        grid,
        treeNode,
        display
    };
});

export default layer;
