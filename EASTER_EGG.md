We want to build an easter egg for the page.

We have a bunch of sprites as PNGs that we can use.

# Animations
## Duckie z-move

We load front_1_in.png. We slowly scale it up to make it appear as the duck is coming towards us.
We then trigger a transition with front_2_transition_in.png to get to the finished state, which is front_3_finished.png.
We hold, then we use the two transitions (front_4_transition_out.png and front_5_transition_out2.png) to go towars the finished state.
Then we start scaling it down.

Essentially what this does, is a duck that comes towawrds us, lifts a little flag that says "console" (already included in png), then turns around and leaves again.

Trigger: no cursor move for 5 seconds.
Position: anywhere on the screen, at random.
Transform origin: y:bottom-20% and x:center

## Duckie side entrance

We want the duckie to appear from the side (from the right, bottom-1/3 of the screen). We use sprite side_1_in for that with translate negative x.
Then we side_2_transition_in until we get to side_3_finished.png.
Then we side_4_transition_out and side_5_out with translate x.

Trigger: scrolling down, the more you scroll the more chances the duckie appears.
Repeat: once shown, repeat every 2 minutes (interval defined by config, so we can have it spam in localhost)
Position: side of screen
Transform origin: y:bottom-20% and x:center

# Feature description

We have an easter egg component already in the app. it shows some stuff in the dev tools console, asking people to execute a function.
Currently that function generates a discount code.

We want to add the duckie animation that will show the users a little hint about the console.

# Implementation

## Stage 1 - Implement duckie side animation.

## Stage 2 - Implement duckie z-move animation.

## Stage 3 - Expanding easter egg
Expand our function easter egg to pull in our sponsors and partners and create a list with links with utm tags to the sponsors websites.
We'll use this list so that users can choose a partner website where they have to perform an action.
interface EasterEggPartner {
    displayName: string;
    url: string;
    private functionParameter: string;
}
For example, get the classlist of an element on a certain page, or get the h1 from x other page. or interact however else.
We will keep a state of expected funciton parameters (server side)
This leads to: users see a console info, they choose a parter, go do the action, then invoke the function with that parameter.
Depending on that, we generate a discount code for the "hackers" in devtools.