import torch
import torch.nn as nn
import torchvision.models as models

class SiameseNetwork(nn.Module):
    def __init__(self):
        super(SiameseNetwork, self).__init__()
        self.base_cnn = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)

        # Freeze initial layers, fine-tune deeper layers
        for name, param in self.base_cnn.named_parameters():
            param.requires_grad = False
        for name, param in self.base_cnn.layer2.named_parameters():
            param.requires_grad = True
        for name, param in self.base_cnn.layer3.named_parameters():
            param.requires_grad = True
        for name, param in self.base_cnn.layer4.named_parameters():
            param.requires_grad = True

        self.base_cnn = nn.Sequential(*list(self.base_cnn.children())[:-2])

        # Self-Attention at three levels
        self.self_attention_layer2 = SelfAttention(512)
        self.self_attention_layer3 = SelfAttention(1024)
        self.self_attention_layer4 = SelfAttention(2048)

        # Cross-Attention after Self-Attention
        self.cross_attention = CrossAttention(2048)

        # Global Attention for unified batch-wide context
        self.global_attention = GlobalAttention(2048)

        # Fully Connected Layers
        self.fc = nn.Sequential(
            nn.Linear(2048, 1024),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(1024),
            nn.Dropout(0.5),
            nn.Linear(1024, 128),
            nn.Tanh()
        )

        self.classifier = nn.Linear(128 * 7, 13)  # 7 images per outfit

    def forward_once(self, x):
        output = self.base_cnn(x)
        output = output.view(output.size(0), 2048, -1)
        output = output.mean(dim=2)
        return output

    def forward(self, *inputs):
        embeddings = torch.stack([self.forward_once(img) for img in inputs], dim=1)  # (B, 7, 2048)

        # Self-Attention on Layer 2
        attended_embeddings_layer2, _ = self.self_attention_layer2(embeddings[:, :, :512])
        attended_embeddings_layer2 = torch.cat((attended_embeddings_layer2, embeddings[:, :, 512:]), dim=2)

        # Self-Attention on Layer 3
        attended_embeddings_layer3, _ = self.self_attention_layer3(attended_embeddings_layer2[:, :, :1024])
        attended_embeddings_layer3 = torch.cat((attended_embeddings_layer3, attended_embeddings_layer2[:, :, 1024:]), dim=2)

        # Self-Attention on Layer 4
        attended_embeddings_layer4, _ = self.self_attention_layer4(attended_embeddings_layer3)

        # Cross-Attention (exchange information between images)
        cross_attended_embeddings, _ = self.cross_attention(attended_embeddings_layer4, attended_embeddings_layer4)

        # Global Attention (learn global context across outfits)
        global_attended_embeddings, attention_weights = self.global_attention(cross_attended_embeddings)

        # Fully Connected Network
        refined_embeddings = global_attended_embeddings.view(-1, 7, 2048)
        refined_embeddings = self.fc(refined_embeddings.view(-1, 2048))
        refined_embeddings = refined_embeddings.view(-1, 7 * 128)

        # Classification
        logits = self.classifier(refined_embeddings)
        return logits, attention_weights


class SelfAttention(nn.Module):
    def __init__(self, in_dim):
        super(SelfAttention, self).__init__()
        self.query = nn.Linear(in_dim, in_dim // 8)
        self.key = nn.Linear(in_dim, in_dim // 8)
        self.value = nn.Linear(in_dim, in_dim)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x):
        batch_size, num_images, feat_dim = x.shape  # (B, 5, F)

        Q = self.query(x)
        K = self.key(x).transpose(1, 2)
        V = self.value(x)

        attention_scores = torch.bmm(Q, K)
        attention_weights = self.softmax(attention_scores)

        attended_values = torch.bmm(attention_weights, V)

        return attended_values + x, attention_weights

class CrossAttention(nn.Module):
    def __init__(self, in_dim):
        super(CrossAttention, self).__init__()
        self.query = nn.Linear(in_dim, in_dim // 8)
        self.key = nn.Linear(in_dim, in_dim // 8)
        self.value = nn.Linear(in_dim, in_dim)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x, context):
        batch_size, num_images, feat_dim = x.shape

        Q = self.query(x)
        K = self.key(context).transpose(1, 2)
        V = self.value(context)

        attention_scores = torch.bmm(Q, K)
        attention_weights = self.softmax(attention_scores)

        attended_values = torch.bmm(attention_weights, V)

        return attended_values + x, attention_weights

class GlobalAttention(nn.Module):
    def __init__(self, in_dim):
        super(GlobalAttention, self).__init__()
        self.query = nn.Linear(in_dim, in_dim // 8)
        self.key = nn.Linear(in_dim, in_dim // 8)
        self.value = nn.Linear(in_dim, in_dim)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x):
        """
        Global Attention: Allows each outfit image to attend to **all images in the batch**.
        - x: Feature tensor (B, 5, F)
        """
        batch_size, num_images, feat_dim = x.shape  # (B, 5, F)
        x_flat = x.view(batch_size * num_images, feat_dim)  # Flatten across batch

        Q = self.query(x_flat)  # (B*5, F//8)
        K = self.key(x_flat).transpose(0, 1)  # (F//8, B*5)
        V = self.value(x_flat)  # (B*5, F)

        attention_scores = torch.mm(Q, K)  # (B*5, B*5)
        attention_weights = self.softmax(attention_scores)

        attended_values = torch.mm(attention_weights, V)

        attended_values = attended_values.view(batch_size, num_images, feat_dim)  # Reshape back to (B, 5, F)

        return attended_values + x, attention_weights