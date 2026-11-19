package com.unoarena.game;

import java.util.*;

/** In-memory UNO match state. */
public final class UnoGame {
    public enum Color { RED, BLUE, GREEN, YELLOW, WILD }
    public enum Type { NUMBER, SKIP, REVERSE, DRAW_TWO, WILD, WILD_DRAW_FOUR }
    public enum Status { PLAYING, FINISHED }
    public record Card(String id, Color color, Type type, int value) {}
    public record PlayerView(String id, String username, List<Card> hand, int cardCount) {}
    public record View(String id, Status status, List<PlayerView> players, int currentPlayer,
                       Card topCard, Color currentColor, int drawPileCount, String winnerId) {}

    private static final List<Color> COLORS = List.of(Color.RED, Color.BLUE, Color.GREEN, Color.YELLOW);
    private final String id;
    private final List<Player> players = new ArrayList<>();
    private final Deque<Card> drawPile = new ArrayDeque<>();
    private final Deque<Card> discardPile = new ArrayDeque<>();
    private int currentPlayer;
    private int direction = 1;
    private Color currentColor;
    private Status status = Status.PLAYING;
    private String winnerId;
    private boolean calledUno;

    private static final class Player {
        final String id, name; final List<Card> hand = new ArrayList<>();
        Player(String id, String name) { this.id=id; this.name=name; }
    }

    public UnoGame(String id, List<String[]> seats) {
        this.id = id;
        for (String[] seat : seats) players.add(new Player(seat[0], seat[1]));
        List<Card> deck = new ArrayList<>();
        for (Color color : COLORS) {
            deck.add(card(color, Type.NUMBER, 0));
            for (int value=1; value<=9; value++) { deck.add(card(color,Type.NUMBER,value)); deck.add(card(color,Type.NUMBER,value)); }
            for (Type type : List.of(Type.SKIP,Type.REVERSE,Type.DRAW_TWO)) { deck.add(card(color,type,0)); deck.add(card(color,type,0)); }
        }
        for (int i=0;i<4;i++) { deck.add(card(Color.WILD,Type.WILD,0)); deck.add(card(Color.WILD,Type.WILD_DRAW_FOUR,0)); }
        Collections.shuffle(deck); drawPile.addAll(deck);
        for (Player player:players) for(int i=0;i<7;i++) player.hand.add(draw());
        Card first;
        do { first=draw(); } while(first.color()==Color.WILD);
        discardPile.push(first); currentColor=first.color();
        if(first.type()==Type.SKIP) advance();
        else if(first.type()==Type.REVERSE) { direction=-1; if(players.size()==2) advance(); }
        else if(first.type()==Type.DRAW_TWO) { take(players.get(currentPlayer),2); advance(); }
    }
    private Card card(Color color, Type type, int value) { return new Card(UUID.randomUUID().toString(),color,type,value); }
    private Card draw() {
        if(drawPile.isEmpty() && discardPile.size()>1) {
            Card top=discardPile.pop(); List<Card> refill=new ArrayList<>(discardPile); discardPile.clear(); discardPile.push(top);
            Collections.shuffle(refill); drawPile.addAll(refill);
        }
        return drawPile.pollFirst();
    }
    private void take(Player player,int count) { for(int i=0;i<count;i++){Card card=draw();if(card!=null)player.hand.add(card);} }
    private int next(int from) { return (from + direction + players.size()) % players.size(); }
    private void advance() { currentPlayer=next(currentPlayer); calledUno=false; }
    private Player active(String userId) {
        if(status!=Status.PLAYING) throw new IllegalStateException("GAME_FINISHED");
        Player player=players.get(currentPlayer);
        if(!player.id.equals(userId)) throw new IllegalStateException("NOT_YOUR_TURN");
        return player;
    }
    private boolean playable(Card card) {
        Card top=discardPile.peek();
        return card.color()==Color.WILD || card.color()==currentColor ||
            (card.type()==top.type() && card.type()!=Type.NUMBER) ||
            (card.type()==Type.NUMBER && top.type()==Type.NUMBER && card.value()==top.value());
    }
    public synchronized View play(String userId,String cardId,Color chosenColor) {
        Player player=active(userId);
        Card card=player.hand.stream().filter(c->c.id().equals(cardId)).findFirst().orElseThrow(()->new IllegalArgumentException("CARD_NOT_IN_HAND"));
        if(!playable(card)) throw new IllegalArgumentException("CARD_NOT_PLAYABLE");
        if(card.color()==Color.WILD && chosenColor==null) throw new IllegalArgumentException("CHOOSE_COLOR");
        if(card.color()!=Color.WILD && chosenColor!=null) throw new IllegalArgumentException("COLOR_NOT_ALLOWED");
        player.hand.remove(card); discardPile.push(card); currentColor=card.color()==Color.WILD?chosenColor:card.color();
        if(player.hand.isEmpty()) { status=Status.FINISHED; winnerId=player.id; return view(userId); }
        boolean one=player.hand.size()==1;
        if(card.type()==Type.SKIP) advance();
        else if(card.type()==Type.REVERSE) { direction*=-1; if(players.size()==2) advance(); }
        else if(card.type()==Type.DRAW_TWO) { currentPlayer=next(currentPlayer);take(players.get(currentPlayer),2);advance(); }
        else if(card.type()==Type.WILD_DRAW_FOUR) { currentPlayer=next(currentPlayer);take(players.get(currentPlayer),4);advance(); }
        else advance();
        calledUno=one;
        return view(userId);
    }
    public synchronized View draw(String userId) {
        Player player=active(userId); Card card=draw(); if(card!=null) player.hand.add(card); advance(); return view(userId);
    }
    public synchronized View uno(String userId) {
        if(players.stream().noneMatch(p->p.id.equals(userId))) throw new IllegalArgumentException("USER_NOT_IN_ROOM");
        if(players.get(currentPlayer).id.equals(userId) && players.get(currentPlayer).hand.size()==1) { calledUno=true; return view(userId); }
        throw new IllegalStateException("UNO_NOT_AVAILABLE");
    }
    public synchronized void end(String userId) { status=Status.FINISHED; winnerId=null; }
    public synchronized boolean isFinished() { return status==Status.FINISHED; }
    public synchronized View view(String viewerId) {
        List<PlayerView> views=players.stream().map(p->new PlayerView(p.id,p.name,p.id.equals(viewerId)?List.copyOf(p.hand):List.of(),p.hand.size())).toList();
        return new View(id,status,views,currentPlayer,discardPile.peek(),currentColor,drawPile.size(),winnerId);
    }
}
