import "@/index.css";

import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { LoadingIndicator } from "@openai/apps-sdk-ui/components/Indicator";
import { useEffect, useState } from "react";
import { FormattedMessage, IntlProvider } from "react-intl";
import {
  mountWidget,
  useDisplayMode,
  useSendFollowUpMessage,
  useUser,
} from "skybridge/web";
import { useCallTool, useToolInfo } from "../helpers.js";

import enUS from "./locales/en-US.json" with { type: "json" };
import esES from "./locales/es-ES.json" with { type: "json" };
import frFR from "./locales/fr-FR.json" with { type: "json" };
import itIT from "./locales/it-IT.json" with { type: "json" };
import ptBR from "./locales/pt-BR.json" with { type: "json" };

type Word = Record<"en" | "fr" | "it" | "pt" | "es", string>;

function PlayWidget() {
  const { locale } = useUser();
  const intlLocale = locale ?? "en-US";
  const lang = (intlLocale.split("-")[0] ?? "en") as keyof Word;

  const [visible, setVisible] = useState(false);
  const [card, setCard] = useState<{ word: Word; illustrationUrl: string }>();
  const [, setDisplayMode] = useDisplayMode();
  const { responseMetadata } = useToolInfo<"play">() as unknown as {
    responseMetadata: { word: Word; illustrationUrl: string } | null;
  };

  useEffect(() => {
    if (responseMetadata) {
      setCard(responseMetadata);
    }
  }, [responseMetadata]);

  const { callTool: play, isPending } = useCallTool("play");
  const sendFollowUpMessage = useSendFollowUpMessage();

  const messages: Record<string, Record<string, string>> = {
    "en-US": enUS,
    "fr-FR": frFR,
    "it-IT": itIT,
    "es-ES": esES,
    "pt-BR": ptBR,
  };

  const displayWord = card?.word[lang] ?? card?.word.en;

  return (
    <IntlProvider
      locale={intlLocale}
      messages={messages[intlLocale] ?? messages["en-US"]}
    >
      <div className="flex flex-col items-center justify-center gap-4 p-4">
        <div className="flex flex-col items-center w-fit p-4 gap-4 rounded-xl border border-white/20 shadow-lg bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100">
          <Badge size="sm" color="info" variant={visible ? "outline" : "solid"}>
            Time's Up
          </Badge>
          {card ? (
            visible ? (
              <img
                src={card.illustrationUrl}
                alt={displayWord}
                className={`w-20 h-20 transition-all duration-800 ${visible ? "opacity-100" : "opacity-0 blur-3xl"}`}
              />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center text-4xl font-bold">
                ?
              </div>
            )
          ) : (
            <LoadingIndicator size={16} className="m-8" />
          )}
          <Badge
            size="lg"
            color="info"
            variant="solid"
            className={`capitalize transition-all duration-800 ${visible ? "" : "blur-3xl"}`}
          >
            {displayWord}
          </Badge>
        </div>
        {visible ? (
          <Button
            color="secondary"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              setCard(undefined);
              play(
                {},
                {
                  onSuccess: (data: any) => {
                    setCard(data.meta);
                    sendFollowUpMessage(
                      `The user has decided to draw another card. The id of this new card is: ${data.structuredContent.id}. Don't show this id to the user. Use this new id when making guesses with the 'guess' tool.`,
                    );
                  },
                },
              );
            }}
          >
            <FormattedMessage id="drawAnotherCard" />
          </Button>
        ) : (
          <Button
            color="primary"
            disabled={!card}
            onClick={() => {
              setDisplayMode("pip");
              setVisible(true);
            }}
          >
            <FormattedMessage id="newGame" />
          </Button>
        )}
      </div>
    </IntlProvider>
  );
}

export default PlayWidget;

mountWidget(<PlayWidget />);
