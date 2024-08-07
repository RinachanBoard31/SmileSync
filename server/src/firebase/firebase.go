package firebase

import (
	"context"
	"log"
	"os"
	"smile-sync/src/utils"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

var (
	Client       *firestore.Client
	CollectionId = "smilepoint_history"
	DocId        string
)

func InitFirestore() {
	ctx := context.Background()
	saPath := "./smilesync-service-account.json"
	// debug時のServiceAccountファイルのパス指定
	if _, err := os.Stat(saPath); os.IsNotExist(err) {
		saPath = "../smilesync-service-account.json"
	}
	sa := option.WithCredentialsFile(saPath)
	projectId := os.Getenv("FIRESTORE_PROJECT_ID")
	client, err := firestore.NewClient(ctx, projectId, sa)
	if err != nil {
		log.Fatalf("Failed to create Firestore client: %v", err)
	}
	Client = client
}

func CloseFirestore() {
	if Client != nil {
		if err := Client.Close(); err != nil {
			log.Fatalf("Failed to close Firestore client: %v", err)
		}
	}
}

type SmilePoint struct {
	Timestamp time.Time `firestore:"timestamp"`
	ClientId  string    `firestore:"client_id"`
	Nickname  string    `firestore:"nickname"`
	Point     int       `firestore:"smile_point"`
}

func SaveSmilePoint(sp SmilePoint) error {
	ctx := context.Background()
	if DocId == "" {
		DocId = utils.ConvertYYYYMMDDHHMMSS(time.Now())
	}
	docRef := Client.Collection(CollectionId).Doc(DocId)
	// Docが存在するか確認
	_, err := docRef.Get(ctx)
	if err != nil {
		// 存在しないなら、新しいドキュメントを作成
		_, err = docRef.Set(ctx, map[string]interface{}{
			"smile_points": []SmilePoint{sp},
		})
		if err != nil {
			return err
		}
	} else {
		// 存在するなら、既存のドキュメントにメッセージを追加
		_, err = docRef.Update(ctx, []firestore.Update{
			{
				Path:  "smile_points",
				Value: firestore.ArrayUnion(sp),
			},
		})
		if err != nil {
			return err
		}
	}
	return nil
}
